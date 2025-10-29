import { RequestCache } from "./cache";
import { HttpError } from "./errors";
import { type LoadingFunction, LoadingManager } from "./loading";
import type {
  CommonOptions,
  DynamicHeadersHandler,
  FetchConfig,
  HttpClientConfig,
  JsonOptions,
  MessageFunction,
  RawOptions,
  UnauthorizedHandler,
} from "./types";

const defaultPanicHandler = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = `${window.location.origin}/login`;
  location.reload();
  throw new Error("无法处理，刷新页面");
};

const NoneSymbol = Symbol("none");

const isNone = (val: unknown): val is null | undefined => {
  return (val ?? NoneSymbol) === NoneSymbol;
};

const extractErrorMessage = (errorData: unknown): string | undefined => {
  if (!isNone(errorData)) {
    if (typeof errorData === "object") {
      const obj = errorData as Record<string, unknown>;
      const text = obj.errorMessage || obj.message || obj.msg || obj.error;
      if (text) {
        return typeof text === "string" ? text : JSON.stringify(text);
      }
    }
    return String(errorData);
  }
  return undefined;
};

/**
 * HTTP客户端实现
 * 提供统一的请求处理、错误处理、缓存、认证等功能
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #timeout: number;
  readonly #cache: RequestCache;
  #loadingManager: LoadingManager;
  #messageFunction: MessageFunction | null;
  readonly #getDynamicHeaders?: DynamicHeadersHandler;
  readonly #onUnauthorized?: UnauthorizedHandler;
  readonly #globalFetchConfig: RequestInit;
  readonly #panicOrRestart: () => never;

  constructor({
    baseUrl,
    timeout = 60_000,
    getDynamicHeaders,
    onUnauthorized,
    messageFunction = null,
    loadingFunction = null,
    globalFetchConfig = {},
    panicOrRestart = defaultPanicHandler,
  }: HttpClientConfig) {
    if (!baseUrl) {
      throw new Error("必须提供 baseUrl");
    }
    this.#baseUrl = baseUrl;
    this.#timeout = timeout;
    this.#getDynamicHeaders = getDynamicHeaders;
    this.#onUnauthorized = onUnauthorized;
    this.#messageFunction = messageFunction;
    this.#loadingManager = new LoadingManager(loadingFunction);
    this.#globalFetchConfig = globalFetchConfig;
    this.#panicOrRestart = panicOrRestart;
    this.#cache = new RequestCache();
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

  /**
   * 发送请求并返回JSON响应
   * @param config 请求配置
   * @param options 可选配置项
   */
  async fetch<T>(
    config: FetchConfig,
    options?: Partial<JsonOptions>,
  ): Promise<T>;

  /**
   * 发送请求并返回原始Response对象
   * @param config 请求配置
   * @param options 非JSON响应的配置项
   */
  async fetch(config: FetchConfig, options: RawOptions): Promise<Response>;

  /**
   * @param config 请求配置
   * @param options
   */
  async fetch<T>(
    config: FetchConfig,
    options: Partial<CommonOptions> & { responseIsJson: boolean },
  ): Promise<T | Response>;

  /**
   * 请求实现
   * @param config 请求配置
   * @param options 配置项
   */
  async fetch<T>(
    config: FetchConfig,
    options: Partial<CommonOptions & { responseIsJson: boolean }> = {
      responseIsJson: true,
    },
  ): Promise<T | Response> {
    const finalOptions = this.#getDefaultOptions(options);

    // 为每个请求生成唯一 key（用于追踪重试次数），同时用于缓存
    const requestKey = this.#getCacheKey(config);

    if (finalOptions.cache && config.method === "GET") {
      const cached = this.#cache.get<T>(requestKey);
      if (cached) return cached;
    }

    try {
      const response = await this.#doFetch(config, finalOptions);
      const data = await this.#handleResponse<T>(response, finalOptions);

      const dontCache = ["no-cache", "no-store"].includes(
        response.headers.get("Cache-Control") ?? "",
      );

      if (
        finalOptions.cache &&
        config.method === "GET" &&
        finalOptions.responseIsJson &&
        !dontCache
      ) {
        this.#cache.set(requestKey, data, finalOptions.cacheTTL);
      }

      return data;
    } catch (error) {
      // 处理401错误
      if (error instanceof HttpError) {
        if (error.status === 401) {
          if (this.#onUnauthorized) {
            return this.#onUnauthorized<T | Response>(error, config, () =>
              this.fetch<T>(config, finalOptions),
            );
          }
          // 默认处理
          return this.#panicOrRestart();
        } else {
          // 非401错误，直接抛出
          throw error;
        }
      }

      // 处理可能的 AbortError（请求被取消）
      if (error instanceof DOMException && error.name === "AbortError") {
        this.#messageFunction?.error?.("请求被取消");
        throw error;
      }

      // 处理其它类型的错误
      const finalError =
        error instanceof Error ? error : new Error(String(error));
      const msg = finalError.message || "请求发生错误";
      this.#messageFunction?.error?.(msg);
      throw finalError;
    }
  }

  /**
   * 获取合并后的默认配置
   */
  #getDefaultOptions(
    options: Partial<CommonOptions & { responseIsJson?: boolean }>,
  ): Required<CommonOptions & { responseIsJson: boolean }> {
    return {
      loading: true,
      errorMessageShow: true,
      useApiErrorInfo: true,
      withoutGlobalDynamicHeaders: false,
      responseIsJson: true,
      cache: false,
      cacheTTL: 5 * 60 * 1000,
      contentType: "",
      moreHeaders: null,
      clearHeaders: null,
      clearAllHeaders: false,
      ...options,
    };
  }

  /**
   * 生成缓存键
   */
  #getCacheKey(config: FetchConfig): string {
    const params = config.params
      ? new URLSearchParams(config.params).toString()
      : "";
    return `${config.method}:${config.url}${params ? `?${params}` : ""}`;
  }

  /**
   * 执行实际的fetch请求
   */
  async #doFetch(
    config: FetchConfig,
    options: Required<CommonOptions>,
  ): Promise<Response> {
    const controller = new AbortController();
    const { signal } = controller;

    try {
      if (options.loading) {
        this.#loadingManager.start();
      }

      const { promise, resolve, reject } = Promise.withResolvers<Response>();

      globalThis
        .fetch(
          this.#buildUrl(config),
          this.#buildFetchConfig(config, options, signal),
        )
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
  #buildFetchConfig(
    config: FetchConfig,
    options: Required<CommonOptions>,
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
          throw new Error(
            "Blob类型的data必须有type属性，或者手动指定Content-Type",
          );
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
  async #handleResponse<T>(
    response: Response,
    options: Required<CommonOptions & { responseIsJson: boolean }>,
  ): Promise<T | Response> {
    if (!response.ok) {
      throw await this.#createHttpError(response, options);
    }

    if (options.responseIsJson) {
      try {
        return await response.json();
      } catch (e) {
        const error = new Error("响应不是有效的JSON格式", { cause: e });
        throw error;
      }
    }

    return response;
  }

  /**
   * 创建HTTP错误
   */
  async #createHttpError(
    response: Response,
    options: Required<CommonOptions>,
  ): Promise<HttpError> {
    let message = "请求失败";
    let errorData: unknown;

    try {
      errorData = await response.json();
      if (options.useApiErrorInfo && errorData) {
        const errorMessage = extractErrorMessage(errorData);
        if (errorMessage) {
          message = errorMessage;
        }
      }
    } catch {
      // 忽略JSON解析错误
    }

    const error = new HttpError(response.status, message, errorData);
    if (options.errorMessageShow) {
      if (response.status !== 401 || !this.#onUnauthorized) {
        this.#messageFunction?.error?.(`【${response.status}】${message}`);
      }
    }

    return error;
  }
}
