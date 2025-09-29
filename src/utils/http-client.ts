import { RequestCache } from "./cache";
import { HttpError, TokenError } from "./errors";
import { type LoadingFunction, LoadingManager } from "./loading";
import type {
  CommonOptions,
  FetchConfig,
  HttpClientConfig,
  JsonOptions,
  RawOptions,
} from "./types";

type MessageFunction = {
  success?: (msg: string) => void;
  error?: (msg: string) => void;
};

const defaultPanicHandler = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = `${window.location.origin}/login`;
  location.reload();
  throw new Error("无法处理，刷新页面");
};

const extractErrorMessage = (errorData: unknown): string | undefined => {
  if (typeof errorData === "object" && errorData) {
    const obj = errorData as Record<string, unknown>;
    const text = obj.errorMessage || obj.message || obj.msg || obj.error;
    if (text) {
      return typeof text === "string" ? text : JSON.stringify(text);
    }
  }
  return undefined;
};

type PendingCallback = [retry: () => void, cancel: () => void];

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
  #retryCounts: Map<string, number>;
  readonly #maxRefreshRetries: number;
  readonly #refreshTokenConfig: HttpClientConfig["refreshTokenConfig"];
  readonly #getToken?: () => string;
  readonly #globalFetchConfig: RequestInit;
  readonly #panicOrRestart: () => never;
  readonly #pendingTokenRefresh = new Map<string, Array<PendingCallback>>();

  constructor({
    baseUrl,
    timeout = 60_000,
    refreshTokenConfig,
    getToken,
    messageFunction = null,
    loadingFunction = null,
    globalFetchConfig = {},
    panicOrRestart = defaultPanicHandler,
    maxRefreshRetries = 1,
  }: HttpClientConfig) {
    this.#baseUrl = baseUrl;
    this.#timeout = timeout;
    this.#refreshTokenConfig = refreshTokenConfig;
    this.#getToken = getToken;
    this.#messageFunction = messageFunction;
    this.#loadingManager = new LoadingManager(loadingFunction);
    this.#globalFetchConfig = globalFetchConfig;
    this.#panicOrRestart = panicOrRestart;
    this.#cache = new RequestCache();
    this.#retryCounts = new Map();
    this.#maxRefreshRetries = maxRefreshRetries ?? 1;
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

      if (
        finalOptions.cache &&
        config.method === "GET" &&
        finalOptions.responseIsJson
      ) {
        this.#cache.set(requestKey, data, finalOptions.cacheTTL);
      }

      // 请求成功，清理该请求的重试计数（如果有）
      this.#retryCounts.delete(requestKey);

      return data;
    } catch (error) {
      // 处理令牌错误
      if (error instanceof TokenError) {
        return this.#handleTokenError<T>(error, config, finalOptions);
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
      withoutToken: false,
      responseIsJson: true,
      cache: false,
      cacheTTL: 5 * 60 * 1000,
      contentType: "",
      moreHeaders: null,
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

    const headers = new Headers();

    // ++++++++++++++++++++++++++++++++++++++++++++++++++这一部分是默认逻辑
    const token = this.#getToken?.();
    if (token && !options.withoutToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (data && !headers.has("Content-Type")) {
      if (data instanceof FormData || data instanceof URLSearchParams) {
        // 浏览器会自动设置正确的Content-Type
      } else if (data instanceof ReadableStream) {
        headers.set("Content-Type", "application/octet-stream");
      } else {
        headers.set("Content-Type", "application/json");
      }
    }
    // ++++++++++++++++++++++++++++++++++++++++++++++++++默认逻辑结束

    // ++++++++++++++++++++++++++++++++++++++++++++++++++这一部分是用户自定义的全局逻辑，应该覆盖默认逻辑
    for (const [key, value] of Object.entries(
      this.#globalFetchConfig.headers ?? {},
    )) {
      headers.set(key, value);
    }
    // ++++++++++++++++++++++++++++++++++++++++++++++++++用户自定义的全局逻辑结束

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
  #getRequestBody(data: unknown): BodyInit | undefined {
    if (!data) return undefined;

    if (
      data instanceof FormData ||
      data instanceof URLSearchParams ||
      data instanceof ReadableStream
    ) {
      return data;
    }

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
        this.#messageFunction?.error?.("返回的不是JSON格式");
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

    if (response.status === 401) {
      throw new TokenError(message, errorData);
    }

    const error = new HttpError(response.status, message, errorData);
    if (options.errorMessageShow) {
      this.#messageFunction?.error?.(`【${response.status}】${message}`);
    }

    return error;
  }

  /**
   * 处理Token错误
   */
  async #handleTokenError<T>(
    _error: TokenError,
    config: FetchConfig,
    options: Partial<CommonOptions> & { responseIsJson: boolean },
  ): Promise<T | Response> {
    const token = this.#getToken?.();
    if (!token) {
      return this.#panicOrRestart();
    }

    // 使用请求的唯一键追踪重试次数，避免无限刷新
    const requestKey = this.#getCacheKey(config);
    const currentRetries = this.#retryCounts.get(requestKey) ?? 0;
    if (currentRetries >= this.#maxRefreshRetries) {
      // 超过重试次数，不再刷新，触发重启或登录流程
      this.#messageFunction?.error?.("登录已失效（超过最大重试次数）");
      return this.#panicOrRestart();
    }

    this.#retryCounts.set(requestKey, currentRetries + 1);

    const retryRequest = () => this.fetch<T>(config, options);

    const newToken = this.#getToken?.();
    if (newToken && newToken !== token) {
      return retryRequest();
    }

    const pendingRefresh = this.#pendingTokenRefresh.get(token);
    if (pendingRefresh) {
      return new Promise((resolve, reject) => {
        pendingRefresh.push([
          () => {
            resolve(retryRequest());
          },
          () => reject("由于token出错,取消请求"),
        ]);
      });
    }

    const pendingCallbacks: Array<PendingCallback> = [];
    this.#pendingTokenRefresh.set(token, pendingCallbacks);

    try {
      const refreshResponse = await this.fetch(
        this.#refreshTokenConfig.fetchConfig,
        this.#refreshTokenConfig.moreConfig,
      );

      await this.#refreshTokenConfig.handleResponse(refreshResponse);

      pendingCallbacks.forEach(([callback]) => {
        callback();
      });
      this.#pendingTokenRefresh.delete(token);

      return retryRequest();
    } catch (e) {
      console.error("刷新Token失败", e);
      pendingCallbacks.forEach(([, cancel]) => {
        cancel();
      });
      this.#pendingTokenRefresh.delete(token);
      // 刷新过程失败，清除计数并触发 panic
      this.#retryCounts.delete(requestKey);
      this.#messageFunction?.error?.("登录失效");
      return this.#panicOrRestart();
    }
  }
}
