import { LoadingManager, LoadingFunction } from './loading';
import { RequestCache } from './cache';
import { HttpError, TokenError, NetworkError } from './errors';

interface MessageFunction {
  success?: (msg: string) => void;
  error?: (msg: string) => void;
}

export interface FetchOptions<T extends boolean = true> {
  loading?: boolean;
  errorMessageShow?: boolean;
  useApiErrorInfo?: boolean;
  contentType?: string;
  moreHeaders?: Record<string, string>;
  withoutToken?: boolean;
  responseIsJson?: T;
  cache?: boolean;
  cacheTTL?: number;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface FetchConfig {
  url: string;
  method: Method;
  data?: unknown;
  params?: Record<string, string>;
  [key: string]: unknown;
}

interface TokenConfig {
  fetchConfig: FetchConfig;
  moreConfig?: Partial<FetchOptions>;
  handleResponse: (res: unknown) => void | Promise<void>;
}

export class HttpClient {
  readonly #baseUrl: string;
  readonly #timeout: number;
  readonly #cache: RequestCache;
  #loadingManager: LoadingManager;
  #messageFunction: MessageFunction | null;
  readonly #refreshTokenConfig: TokenConfig;
  readonly #getToken: (() => string | undefined) | undefined;
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
    panicOrRestart = () => { throw new Error('未配置 panicOrRestart') },
    cacheCapacity = 100,
    cacheTTL = 5 * 60 * 1000
  }: {
    baseUrl: string;
    timeout?: number;
    refreshTokenConfig: TokenConfig;
    getToken?: () => string;
    messageFunction?: MessageFunction | null;
    loadingFunction?: LoadingFunction | null;
    globalHeaders?: Record<string, string>;
    panicOrRestart?: () => never;
    cacheCapacity?: number;
    cacheTTL?: number;
  }) {
    this.#baseUrl = baseUrl;
    this.#timeout = timeout;
    this.#refreshTokenConfig = refreshTokenConfig;
    this.#getToken = getToken;
    this.#messageFunction = messageFunction;
    this.#loadingManager = new LoadingManager(loadingFunction);
    this.#globalHeaders = globalHeaders;
    this.#panicOrRestart = panicOrRestart;
    this.#cache = new RequestCache(cacheCapacity, cacheTTL);
  }

  setMessageFunction(fn: MessageFunction | null): void {
    this.#messageFunction = fn;
  }

  setLoadingFunction(fn: LoadingFunction): void {
    this.#loadingManager.setLoadingFunction(fn);
  }

  async fetch<T>(
    config: FetchConfig,
    options: FetchOptions<true> = {}
  ): Promise<T>;
  async fetch(
    config: FetchConfig,
    options: FetchOptions<false>
  ): Promise<Response>;
  async fetch<T>(
    config: FetchConfig,
    options: FetchOptions = {}
  ): Promise<T | Response> {
    const finalOptions = this.#getDefaultOptions(options);
    
    // 处理缓存
    if (finalOptions.cache && config.method === 'GET') {
      const cacheKey = this.#getCacheKey(config);
      const cached = this.#cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.#doFetch(config, finalOptions);
      const data = await this.#handleResponse<T>(response, finalOptions);
      
      // 存入缓存
      if (finalOptions.cache && config.method === 'GET') {
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

  #getDefaultOptions<T extends boolean>(options: FetchOptions<T>): Required<FetchOptions<T>> {
    return {
      loading: true,
      errorMessageShow: true,
      useApiErrorInfo: true,
      withoutToken: false,
      responseIsJson: true as T,
      cache: false,
      cacheTTL: 5 * 60 * 1000,
      ...options
    };
  }

  #getCacheKey(config: FetchConfig): string {
    const params = config.params ? new URLSearchParams(config.params).toString() : '';
    return `${config.method}:${config.url}${params ? `?${params}` : ''}`;
  }

  async #doFetch(
    config: FetchConfig,
    options: Required<FetchOptions>
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

      const timeoutPromise = new Promise((_, reject) => {
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

  #buildUrl(config: FetchConfig): string {
    const url = new URL(config.url, this.#baseUrl);
    if (config.params) {
      url.search = new URLSearchParams(config.params).toString();
    }
    return url.toString();
  }

  #buildFetchConfig(
    config: FetchConfig,
    options: Required<FetchOptions>
  ): RequestInit {
    const headers = new Headers();
    
    // Add token
    const token = this.#getToken?.();
    if (token && !options.withoutToken) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Add content type
    if (config.data) {
      if (config.data instanceof FormData || config.data instanceof URLSearchParams) {
        // Browser will set correct content type
      } else if (config.data instanceof ReadableStream) {
        headers.set('Content-Type', 'application/octet-stream');
      } else {
        headers.set('Content-Type', 'application/json');
      }
    }

    // Add global headers
    Object.entries(this.#globalHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    // Add custom content type
    if (options.contentType) {
      headers.set('Content-Type', options.contentType);
    }

    // Add more headers
    if (options.moreHeaders) {
      Object.entries(options.moreHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    return {
      method: config.method,
      headers,
      body: this.#getRequestBody(config.data)
    };
  }

  #getRequestBody(data: unknown): BodyInit | undefined {
    if (!data) return undefined;
    
    if (data instanceof FormData || 
        data instanceof URLSearchParams || 
        data instanceof ReadableStream) {
      return data;
    }
    
    return JSON.stringify(data);
  }

  async #handleResponse<T>(
    response: Response,
    options: Required<FetchOptions>
  ): Promise<T> {
    if (!response.ok) {
      throw await this.#createHttpError(response, options);
    }

    if (options.responseIsJson) {
      try {
        return await response.json();
      } catch (e) {
        const error = new Error('Response is not valid JSON');
        this.#messageFunction?.error?.('返回的不是JSON格式');
        throw error;
      }
    }
    
    return response as unknown as T;
  }

  async #createHttpError(
    response: Response,
    options: Required<FetchOptions>
  ): Promise<HttpError> {
    let message = '请求失败';
    let errorData;

    try {
      errorData = await response.json();
      if (options.useApiErrorInfo && errorData) {
        const errorMessage = this.#extractErrorMessage(errorData);
        if (errorMessage) {
          message = errorMessage;
        }
      }
    } catch {
      // Ignore JSON parse error
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

  #extractErrorMessage(errorData: unknown): string | undefined {
    if (typeof errorData === 'object' && errorData) {
      const obj = errorData as Record<string, unknown>;
      const text = obj.errorMessage || obj.message || obj.msg || obj.error;
      if (text) {
        return typeof text === 'string' ? text : JSON.stringify(text);
      }
    }
    return undefined;
  }

  async #handleTokenError<T>(
    error: TokenError,
    config: FetchConfig,
    options: Required<FetchOptions>
  ): Promise<T> {
    const token = this.#getToken?.();
    if (!token) {
      return this.#panicOrRestart();
    }

    const retryRequest = () => this.fetch<T>(config, options);
    
    // Check if token has been refreshed
    const newToken = this.#getToken?.();
    if (newToken && newToken !== token) {
      return retryRequest();
    }

    // Check if a token refresh is in progress
    const pendingRefresh = this.#pendingTokenRefresh.get(token);
    if (pendingRefresh) {
      return new Promise((resolve) => {
        pendingRefresh.push(() => {
          resolve(retryRequest());
        });
      });
    }

    // Start a new token refresh
    const pendingCallbacks: Array<() => void> = [];
    this.#pendingTokenRefresh.set(token, pendingCallbacks);

    try {
      const refreshResponse = await this.fetch(
        this.#refreshTokenConfig.fetchConfig,
        this.#refreshTokenConfig.moreConfig
      );
      
      await this.#refreshTokenConfig.handleResponse(refreshResponse);
      
      // Execute pending requests
      pendingCallbacks.forEach((callback) => callback());
      this.#pendingTokenRefresh.delete(token);
      
      return retryRequest();
    } catch (e) {
      this.#messageFunction?.error?.('登录失效');
      return this.#panicOrRestart();
    }
  }
}