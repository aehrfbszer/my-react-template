import type { HttpError } from "./errors";
import type { FetchConfig, HttpClientConfig } from "./types";

/**
 * 401未授权处理器接口
 */
export type UnauthorizedHandler = <T>(
  error: HttpError,
  config: FetchConfig,
  retry: () => Promise<T>,
) => Promise<T>;

/**
 * 重定向到登录页的处理器
 * @param loginUrl 登录页面URL，默认为 /login
 * @returns UnauthorizedHandler
 */
export const redirectToLoginHandler = (
  loginUrl = "/login",
): UnauthorizedHandler => {
  return async (_error: HttpError, _config: FetchConfig): Promise<never> => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = new URL(loginUrl, window.location.origin).toString();
    throw new Error("重定向到登录页");
  };
};

/**
 * 刷新 Token 处理器的配置
 */
export interface RefreshTokenConfig {
  /** 获取旧token的函数 */
  getOldToken: () => string | null;
  /** 获取新token的函数 */
  getNewToken: () => string | null;
  /** 保存新token的函数 */
  saveToken: (token: string) => void;
  /** 刷新token的请求配置 */
  refreshConfig: NonNullable<HttpClientConfig["refreshTokenConfig"]>;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * Token 刷新处理器
 * @param config 刷新配置
 * @returns UnauthorizedHandler
 */
export const refreshTokenHandler = ({
  getOldToken,
  getNewToken,
  saveToken,
  refreshConfig,
  maxRetries = 1,
}: RefreshTokenConfig): UnauthorizedHandler => {
  // 记录正在刷新的token相关的回调
  const pendingRefresh = new Map<
    string,
    Array<
      [resolve: (value: unknown) => void, reject: (reason?: unknown) => void]
    >
  >();
  // 记录重试次数
  const retryCounts = new Map<string, number>();

  return async <T>(
    _error: HttpError,
    config: FetchConfig,
    retry: () => Promise<T>,
  ): Promise<T> => {
    const oldToken = getOldToken();
    if (!oldToken) {
      throw new Error("未登录");
    }

    // 使用请求URL作为重试计数的key
    const retryKey = `${config.method}:${config.url}`;
    const currentRetries = retryCounts.get(retryKey) ?? 0;

    if (currentRetries >= maxRetries) {
      retryCounts.delete(retryKey);
      throw new Error("超过最大重试次数");
    }

    retryCounts.set(retryKey, currentRetries + 1);

    // 检查token是否已经被其他请求更新
    const newToken = getNewToken();
    if (newToken && newToken !== oldToken) {
      return retry();
    }

    // 如果已经有请求在刷新，等待其完成
    const pendingKey = oldToken;
    const pending = pendingRefresh.get(pendingKey);
    if (pending) {
      return new Promise<T>((resolve, reject) => {
        pending.push([resolve as (value: unknown) => void, reject]);
      }).then(() => retry());
    }

    // 开始刷新token
    const callbacks: Array<
      [resolve: (value: unknown) => void, reject: (reason?: unknown) => void]
    > = [];
    pendingRefresh.set(pendingKey, callbacks);

    try {
      const response = await fetch(
        new URL(
          refreshConfig.fetchConfig.url,
          window.location.origin,
        ).toString(),
        {
          ...refreshConfig.fetchConfig,
          headers: {
            ...refreshConfig.fetchConfig.headers,
            Authorization: `Bearer ${oldToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("刷新token失败");
      }

      const data = await response.json();
      await refreshConfig.handleResponse(data);

      // 再次获取新token（因为handleResponse可能已经更新了token）
      const latestToken = getNewToken();
      if (latestToken && latestToken !== oldToken) {
        saveToken(latestToken);
      }

      // 通知其他等待的请求
      callbacks.forEach(([resolve]) => {
        resolve(undefined);
      });
      return retry();
    } catch (e) {
      // 刷新失败，通知其他等待的请求
      callbacks.forEach(([, reject]) => {
        reject(e);
      });
      retryCounts.delete(retryKey);
      throw e;
    } finally {
      // 清理pending状态
      pendingRefresh.delete(pendingKey);
    }
  };
};

/**
 * 自定义401处理器
 * @param handler 自定义的处理逻辑
 * @returns UnauthorizedHandler
 */
export const customUnauthorizedHandler = (
  handler: UnauthorizedHandler,
): UnauthorizedHandler => handler;

/**
 * 组合多个401处理器
 * 按顺序尝试每个处理器，如果处理器抛出错误则尝试下一个
 * @param handlers 401处理器列表
 * @returns UnauthorizedHandler
 */
export const chainUnauthorizedHandlers = (
  handlers: UnauthorizedHandler[],
): UnauthorizedHandler => {
  return async <T>(
    error: HttpError,
    config: FetchConfig,
    retry: () => Promise<T>,
  ): Promise<T> => {
    let lastError: Error | undefined;

    for (const handler of handlers) {
      try {
        return await handler(error, config, retry);
      } catch (e) {
        lastError = e as Error;
      }
    }

    throw lastError ?? new Error("所有401处理器都失败了");
  };
};
