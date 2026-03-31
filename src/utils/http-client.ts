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
  readonly #handleError: HandleErrorFunction;

  constructor({
    baseUrl,
    timeout = 60_000,
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

    const response = await this.#doFetch(config, finalOptions).catch((err) => {
      if (finalOptions.errorMessageShow) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.#messageFunction?.error?.(`请求发生错误：${errorMessage}`);
      }
      throw err;
    });
    const data = await this.#handleResponse<T, J>(response, config, finalOptions);

    return data;
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
      contentType: "",
      moreHeaders: null,
      clearHeaders: null,
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
    const controller = new AbortController();
    const { signal } = controller;

    try {
      if (options.loading) {
        this.#loadingManager.start();
      }

      const { promise, resolve, reject } = Promise.withResolvers<Response>();

      globalThis
        .fetch(this.#buildUrl(config), this.#buildFetchConfig(config, options, signal))
        .then(resolve)
        .catch(reject);

      setTimeout(() => {
        // abort时传入超时信息，会将上面的globalThis.fetch的状态变为aborted，并且reason会被捕获到reject中
        // 这里在调用abort时传入一个字符串作为reason，外面被捕获到的error是这个字符串，并不是一个Error对象
        controller.abort(`请求超时：超过${this.#timeout}ms`);
      }, this.#timeout);

      return await promise;
    } finally {
      if (options.loading) {
        this.#loadingManager.finish();
      }
    }
  }

  /**
   * 构建完整的URL
   */
  #buildUrl(config: FetchConfig): string {
    const url = new URL(config.url, this.#baseUrl);
    if (config.params) {
      /**
       * url.search赋值时的字符串带不带前导问号都一样，规范 https://url.spec.whatwg.org/#dom-url-search
       * 在set时会自动去掉前导问号，在get时会带上前导问号
       * new URLSearchParams(xxx).toString() 生成的字符串是不带问号的
       */
      url.search = new URLSearchParams(config.params).toString();
    }
    return url.toString();
  }

  /**
   * 构建fetch配置
   */
  #buildFetchConfig<J extends boolean>(
    config: FetchConfig,
    options: Required<CommonOptions<J>>,
    signal: AbortSignal,
  ): RequestInit {
    const {
      method,
      data,
      params: _p,
      url: _u,
      headers: useHeaders,
      signal: userSignal,
      ...rest
    } = config;

    let headers = new Headers(this.#globalFetchConfig.headers);

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

    // ++++++++++++++++++++++++++++++++++++++++++++++++++这一部分是用户自定义的全局逻辑，应该覆盖默认逻辑
    if (this.#getDynamicHeaders && !options.withoutGlobalDynamicHeaders) {
      const dynamicHeaders = this.#getDynamicHeaders(config);
      for (const [key, value] of Object.entries(dynamicHeaders)) {
        headers.set(key, value);
      }
    }
    // ++++++++++++++++++++++++++++++++++++++++++++++++++用户自定义的全局逻辑结束

    if (options.clearHeaders) {
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

    // +++++++++++++++++++++++++++++++++++++++++++++++++++这一部分是用户每次请求时传入的配置之外还附加的额外选项，应该覆盖前面所有逻辑

    if (options.contentType) {
      headers.set("Content-Type", options.contentType);
    }

    if (options.moreHeaders) {
      for (const [key, value] of Object.entries(options.moreHeaders)) {
        headers.set(key, value);
      }
    }
    // +++++++++++++++++++++++++++++++++++++++++++++++++++用户每次请求时传入的配配置之外还附加的额外选项结束

    return {
      ...this.#globalFetchConfig,
      ...rest,
      method,
      headers,
      body: this.#getRequestBody(data),
      signal: userSignal ?? this.#globalFetchConfig.signal ?? signal,
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
      // If data is ArrayBufferView<ArrayBufferLike>, cast to ArrayBufferView<ArrayBuffer>
      // 这里是为了过ts的类型检查
      if (ArrayBuffer.isView(data)) {
        return data as ArrayBufferView<ArrayBuffer>;
      }
      return data;
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

      this.#handleError(response, [config, options, this.fetch.bind(this)], resolve);

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
