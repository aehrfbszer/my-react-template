import { LoadingManager, type LoadingFunction } from './loading';
import { RequestCache } from './cache';
import { HttpError, TokenError, NetworkError } from './errors';
import type { 
  HttpClientConfig,
  CommonOptions,
  JsonOptions,
  RawOptions,
  FetchConfig 
} from './types';

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
  if (typeof errorData === 'object' && errorData) {
    const obj = errorData as Record<string, unknown>;
    const text = obj.errorMessage || obj.message || obj.msg || obj.error;
    if (text) {
      return typeof text === 'string' ? text : JSON.stringify(text);
    }
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
  readonly #refreshTokenConfig: HttpClientConfig['refreshTokenConfig'];
  readonly #getToken?: () => string;
  readonly #globalHeaders: Record<string, string>;
  readonly #panicOrRestart: () => never;
  readonly #pendingTokenRefresh = new Map<string, Array<() => void>>();

  constructor({
    baseUrl,
    timeout = 60_000,
    refreshTokenConfig,
    getToken,
    messageFunction = null,
    loadingFunction = null,
    globalHeaders = {},
    panicOrRestart = defaultPanicHandler
  }: HttpClientConfig) {
    this.#baseUrl = baseUrl;
    this.#timeout = timeout;
    this.#refreshTokenConfig = refreshTokenConfig;
    this.#getToken = getToken;
    this.#messageFunction = messageFunction;
    this.#loadingManager = new LoadingManager(loadingFunction);
    this.#globalHeaders = globalHeaders;
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
    options?: Partial<JsonOptions>
  ): Promise<T>;

  /**
   * 发送请求并返回原始Response对象
   * @param config 请求配置
   * @param options 非JSON响应的配置项
   */
  async fetch(
    config: FetchConfig,
    options: RawOptions
  ): Promise<Response>;

  /**
   * 请求实现
   * @param config 请求配置
   * @param options 配置项
   */
  async fetch<T>(
    config: FetchConfig,
    options: Partial<CommonOptions & { responseIsJson?: boolean }> = { responseIsJson: true }
  ): Promise<T | Response> {
    const finalOptions = this.#getDefaultOptions(options);
    
    if (finalOptions.cache && config.method === 'GET') {
      const cacheKey = this.#getCacheKey(config);
      const cached = this.#cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.#doFetch(config, finalOptions);
      const data = await this.#handleResponse<T>(response, finalOptions);
      
      if (finalOptions.cache && config.method === 'GET' && finalOptions.responseIsJson) {
        const cacheKey = this.#getCacheKey(config);
        this.#cache.set(cacheKey, data, finalOptions.cacheTTL);
      }
      
      return data;
    } catch (error) {
      if (error instanceof TokenError) {
        return this.#handleTokenError<T>(error, config, finalOptions);
      }
      throw error;
    }
  }

  /**
   * 获取合并后的默认配置
   */
  #getDefaultOptions(options: Partial<CommonOptions & { responseIsJson?: boolean }>): Required<CommonOptions & { responseIsJson: boolean }> {
    return {
      loading: true,
      errorMessageShow: true,
      useApiErrorInfo: true,
      withoutToken: false,
      responseIsJson: true,
      cache: false,
      cacheTTL: 5 * 60 * 1000,
      contentType: '',
      moreHeaders: {},
      ...options
    };
  }

  /**
   * 生成缓存键
   */
  #getCacheKey(config: FetchConfig): string {
    const params = config.params 
      ? new URLSearchParams(config.params).toString()
      : '';
    return `${config.method}:${config.url}${params ? `?${params}` : ''}`;
  }

  /**
   * 执行实际的fetch请求
   */
  async #doFetch(
    config: FetchConfig,
    options: Required<CommonOptions>
  ): Promise<Response> {
    const controller = new AbortController();
    const { signal } = controller;

    try {
      if (options.loading) {
        this.#loadingManager.start();
      }

      const fetchPromise = fetch(this.#buildUrl(config), {
        ...this.#buildFetchConfig(config, options),
        signal
      });

      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => {
          controller.abort();
          reject(new NetworkError('请求超时'));
        }, this.#timeout);
      });

      return await Promise.race([fetchPromise, timeoutPromise]);
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
    options: Required<CommonOptions>
  ): RequestInit {
    const headers = new Headers();
    
    const token = this.#getToken?.();
    if (token && !options.withoutToken) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (config.data) {
      if (config.data instanceof FormData || config.data instanceof URLSearchParams) {
        // 浏览器会自动设置正确的Content-Type
      } else if (config.data instanceof ReadableStream) {
        headers.set('Content-Type', 'application/octet-stream');
      } else {
        headers.set('Content-Type', 'application/json');
      }
    }

    for (const [key, value] of Object.entries(this.#globalHeaders)) {
      headers.set(key, value);
    }

    if (options.contentType) {
      headers.set('Content-Type', options.contentType);
    }

    if (options.moreHeaders) {
      for (const [key, value] of Object.entries(options.moreHeaders)) {
        headers.set(key, value);
      }
    }

    return {
      method: config.method,
      headers,
      body: this.#getRequestBody(config.data)
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
    options: Required<CommonOptions & { responseIsJson: boolean }>
  ): Promise<T | Response> {
    if (!response.ok) {
      throw await this.#createHttpError(response, options);
    }

    if (options.responseIsJson) {
      try {
        return await response.json();
      } catch (e) {
        const error = new Error('响应不是有效的JSON格式');
        this.#messageFunction?.error?.('返回的不是JSON格式');
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
    options: Required<CommonOptions>
  ): Promise<HttpError> {
    let message = '请求失败';
    let errorData;

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
    options: Partial<CommonOptions & { responseIsJson: boolean }>
  ): Promise<T> {
    const token = this.#getToken?.();
    if (!token) {
      return this.#panicOrRestart();
    }

    const retryRequest = () => this.fetch<T>(config, { ...options, responseIsJson: true } as JsonOptions);
    
    const newToken = this.#getToken?.();
    if (newToken && newToken !== token) {
      return retryRequest();
    }

    const pendingRefresh = this.#pendingTokenRefresh.get(token);
    if (pendingRefresh) {
      return new Promise((resolve) => {
        pendingRefresh.push(() => {
          resolve(retryRequest());
        });
      });
    }

    const pendingCallbacks: Array<() => void> = [];
    this.#pendingTokenRefresh.set(token, pendingCallbacks);

    try {
      const refreshResponse = await this.fetch(
        this.#refreshTokenConfig.fetchConfig,
        {
          ...this.#refreshTokenConfig.moreConfig,
          responseIsJson: true
        } as JsonOptions
      );
      
      await this.#refreshTokenConfig.handleResponse(refreshResponse);
      
      pendingCallbacks.forEach((callback) => callback());
      this.#pendingTokenRefresh.delete(token);
      
      return retryRequest();
    } catch (e) {
      this.#messageFunction?.error?.('登录失效');
      return this.#panicOrRestart();
    }
  }
}
