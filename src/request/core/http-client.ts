import { type LoadingFunction, LoadingManager } from "./loading";
import type {
  CommonOptions,
  DynamicHeadersHandler,
  FetchConfig,
  HandleErrorFunction,
  HttpClientConfig,
  MessageFunction,
} from "./types";

const NoneSymbol = Symbol("none");

const isNone = (val: unknown): val is null | undefined => {
  return (val ?? NoneSymbol) === NoneSymbol;
};

/**
 * HTTP客户端实现
 * 提供统一的请求处理、错误处理、缓存、认证等功能
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #timeout: number;
  #loadingManager: LoadingManager;
  #messageFunction: MessageFunction | null;
  readonly #getDynamicHeaders?: DynamicHeadersHandler;
  readonly #globalFetchConfig: RequestInit;

  // 错误处理函数，默认会将非2xx的响应当做错误，入参的resolve函数必须被调用，否则fetch方法的Promise将永远处于pending状态
  // 设计成必须调用resolve函数，是为了让用户有机会在错误处理函数里进行重试等操作，如果不调用resolve函数，用户就无法控制fetch方法的Promise的状态了
  readonly #handleError: HandleErrorFunction;

  constructor({
    baseUrl,
    timeout = 0,
    getDynamicHeaders,
    messageFunction = null,
    loadingFunction = null,
    globalFetchConfig = {},
    handleError = (rawRes, rawParams, resolve) => {
      const [_config, options] = rawParams;
      if (options.errorMessageShow) {
        this.#messageFunction?.error?.(`请求失败，状态码：【${rawRes.status}】`);
      }

      resolve(Promise.reject(rawRes));
    },
  }: HttpClientConfig) {
    if (!baseUrl) {
      throw new Error("必须提供 baseUrl");
    }
    this.#baseUrl = baseUrl;
    this.#timeout = timeout;
    this.#getDynamicHeaders = getDynamicHeaders;
    this.#messageFunction = messageFunction;
    this.#loadingManager = new LoadingManager(loadingFunction);
    this.#globalFetchConfig = globalFetchConfig;
    this.#handleError = handleError;
  }

  /**
   * 设置消息处理函数
   */
  setMessageFunction(fn: MessageFunction | null): void {
    this.#messageFunction = fn;
  }

  /**
   * 设置加载状态处理函数
   */
  setLoadingFunction(fn: LoadingFunction): void {
    this.#loadingManager.setLoadingFunction(fn);
  }

  async fetch<T>(config: FetchConfig): Promise<T>;

  async fetch<T, J extends boolean = true>(
    config: FetchConfig,
    options: Partial<CommonOptions<J>>,
  ): Promise<J extends true ? T : Response>;

  async fetch<T, J extends boolean = false>(
    config: FetchConfig,
    options?: Partial<CommonOptions<J>>,
  ): Promise<J extends true ? T : Response>;

  /**
   * 请求实现
   * @param config 请求配置
   * @param options 配置项
   */
  async fetch<T, J extends boolean>(
    config: FetchConfig,
    options?: Partial<CommonOptions<J>>,
  ): Promise<J extends true ? T : Response> {
    const finalOptions = this.#getDefaultOptions(options);

    try {
      if (finalOptions.loading) {
        this.#loadingManager.start();
      }
      const response = await this.#doFetch(config, finalOptions).catch((err) => {
        if (finalOptions.errorMessageShow) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.#messageFunction?.error?.(`请求发生错误：${errorMessage}`);
        }
        throw err;
      });
      const data = await this.#handleResponse<T, J>(response, config, finalOptions);

      return data;
    } finally {
      if (finalOptions.loading) {
        this.#loadingManager.finish();
      }
    }
  }

  /**
   * 获取合并后的默认配置
   */
  #getDefaultOptions<T extends boolean>(
    options?: Partial<CommonOptions<T>>,
  ): Required<CommonOptions<T>> {
    return {
      loading: true,
      errorMessageShow: true,
      withoutGlobalDynamicHeaders: false,
      responseIsJson: true as T,
      clearHeaders: [],
      clearAllHeaders: false,
      ...options,
    };
  }

  /**
   * 执行实际的fetch请求
   */
  async #doFetch<T extends boolean>(
    config: FetchConfig,
    options: Required<CommonOptions<T>>,
  ): Promise<Response> {
    const { promise, resolve, reject } = Promise.withResolvers<Response>();

    let globalTimeoutSignal: AbortSignal | null = null;
    if (this.#timeout > 0) {
      globalTimeoutSignal = AbortSignal.timeout(this.#timeout);
    }

    globalThis
      .fetch(this.#buildUrl(config), this.#buildFetchConfig(config, options, globalTimeoutSignal))
      .then(resolve)
      .catch(reject);

    return await promise;
  }

  /**
   * 构建完整的URL
   */
  #buildUrl(config: FetchConfig): URL {
    const url = new URL(config.url, this.#baseUrl);
    if (config.params) {
      /**
       * url.search赋值时的字符串带不带前导问号都一样，规范 https://url.spec.whatwg.org/#dom-url-search
       * 在set时会自动去掉前导问号，在get时会带上前导问号
       * new URLSearchParams(xxx).toString() 生成的字符串是不带问号的
       */
      url.search = new URLSearchParams(config.params).toString();
    }
    return url;
  }

  /**
   * 构建fetch配置
   */
  #buildFetchConfig<J extends boolean>(
    config: FetchConfig,
    options: Required<CommonOptions<J>>,
    signal: AbortSignal | null,
  ): RequestInit {
    const {
      method,
      data,
      params: _p,
      url: _u,
      headers: useHeaders,
      signal: userSignal,
      requestId,
      ...rest
    } = config;

    if (requestId) {
      console.info(`method: ${method}，URL: ${config.url}, 请求ID: ${requestId}`);
    }

    let headers = new Headers(this.#globalFetchConfig.headers);

    // ++++++++++++++++++++++++++++++++++++++++++++++++++这一部分是用户自定义的全局逻辑，应该覆盖默认逻辑
    if (this.#getDynamicHeaders && !options.withoutGlobalDynamicHeaders) {
      const dynamicHeaders = this.#getDynamicHeaders(config);
      for (const [key, value] of Object.entries(dynamicHeaders)) {
        headers.set(key, value);
      }
    }
    // ++++++++++++++++++++++++++++++++++++++++++++++++++用户自定义的全局逻辑结束

    if (options.clearHeaders?.length) {
      for (const key of options.clearHeaders) {
        headers.delete(key);
      }
    }
    if (options.clearAllHeaders) {
      headers = new Headers();
    }

    // ++++++++++++++++++++++++++++++++++++++++++++++++++这一部分是每次请求时传入的配置，应该覆盖前面所有逻辑
    if (useHeaders) {
      for (const [key, value] of Object.entries(useHeaders)) {
        headers.set(key, value as string);
      }
    }
    // ++++++++++++++++++++++++++++++++++++++++++++++++++每次请求时传入的配置结束

    // +++++++++++++++ 根据data的类型自动设置Content-Type +++++++++++++++

    // 如果data是undefined或null ，则不设置Content-Type
    // 如果data是空字符串，同样不会进入此处逻辑，但是浏览器会设置Content-Type为text/plain;charset=UTF-8
    if (data && !headers.has("Content-Type")) {
      if (data instanceof FormData || data instanceof URLSearchParams) {
        // 浏览器会自动设置正确的Content-Type
        // FormData会自动设置为 multipart/form-data，并带上正确的 boundary
        // URLSearchParams会自动设置为 application/x-www-form-urlencoded
      } else if (
        data instanceof ReadableStream ||
        data instanceof ArrayBuffer ||
        ArrayBuffer.isView(data)
      ) {
        // 对于流和二进制数据，设置为 application/octet-stream
        headers.set("Content-Type", "application/octet-stream");
      } else if (data instanceof Blob) {
        // 对于Blob，浏览器会自动设置Content-Type为Blob的type属性
        // 如果没有type则报错
        if (!data.type) {
          throw new Error("Blob类型的data必须有type属性，或者手动指定Content-Type");
        }
      } else if (typeof data === "object") {
        headers.set("Content-Type", "application/json");
      } else {
        // 其他类型（只能是字符串），浏览器会自动设置为 text/plain;charset=UTF-8
      }
    }
    // +++++++++++++++ 根据data的类型自动设置Content-Type结束 +++++++++++++++

    return {
      ...this.#globalFetchConfig,
      ...rest,
      method,
      headers,
      body: this.#getRequestBody(data),
      // 下面的signal不需要全局signal（即this.#globalFetchConfig.signal），因为signal是一次性的;
      // 全局signal（即this.#globalFetchConfig.signal）也只能初始化时生成一次，一个signal不可能被多个请求共享；
      signal: userSignal ?? signal,
    };
  }

  /**
   * 获取请求体
   */
  #getRequestBody(data: FetchConfig["data"]): BodyInit | null {
    // 使用isNone判断，是为了防止用户传入空字符串
    if (isNone(data)) return null;

    if (
      data instanceof FormData ||
      data instanceof URLSearchParams ||
      data instanceof ReadableStream ||
      data instanceof Blob ||
      data instanceof ArrayBuffer ||
      ArrayBuffer.isView(data) ||
      typeof data === "string"
    ) {
      return data as BodyInit;
    }

    // 这里只能是object类型
    return JSON.stringify(data);
  }

  /**
   * 处理响应
   */
  async #handleResponse<T, J extends boolean>(
    response: Response,
    config: FetchConfig,
    options: Required<CommonOptions<J>>,
  ): Promise<J extends true ? T : Response> {
    if (!response.ok) {
      const { promise, resolve } = Promise.withResolvers<J extends true ? T : Response>();

      /**
       * 之所以在这里生成请求ID，是因为在没拿到response之前，没有追踪请求链路的需求。
       * 没拿到response就说明要不是网络错误，要不是signal.abort了，这两种情况都不需要追踪请求链路了；
       * 只有拿到response了，才说明请求链路走通了，这时候才有追踪请求链路的需求了
       */
      const requestId = crypto.randomUUID(); // 生成请求ID，关联请求和刷新token的过程，便于调试和日志记录

      this.#handleError(
        response,
        [
          {
            ...config,
            // 之所以这样赋值，是因为请求可能是重试的请求，要保留起始请求的ID，便于追踪整个请求链路；
            requestId: config.requestId || requestId,
          },
          options,
          this.fetch.bind(this),
        ],
        resolve,
      );

      return promise;
    }

    if (!response.body) {
      // 实际上浏览器的实现，body是不可能为null的，即使没有响应体，body也是一个ReadableStream；node我就不知道了
      throw new Error("响应体为空");
    }

    if (options.responseIsJson) {
      if (response.status === 204) {
        console.warn(
          "响应状态码为204 No Content，正常情况(HTTP规范)下不应该有响应体，考虑设置responseIsJson为false，跳过对body进行JSON解析",
        );
      }

      try {
        return (await response.json()) as J extends true ? T : Response;
      } catch (e) {
        const error = new Error("响应不是有效的JSON格式", { cause: e });
        throw error;
      }
    }

    return response as J extends true ? T : Response;
  }
}
