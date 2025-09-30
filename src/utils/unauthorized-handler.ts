import type { HttpError } from "./errors";
import type { FetchConfig, UnauthorizedHandler } from "./types";

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
  /** 刷新token的请求配置 */
  refreshConfig: {
    fetchConfig: Omit<FetchConfig, "data" | "params">; // 刷新请求的配置，data和params通常不需要
    responseIsJson: boolean; // 是否将响应解析为JSON
    handleResponse: (res: unknown) => void | Promise<void>;
  };
  /** 最大重试次数 */
  maxRetries?: number;
}

type PendingAction = [
  doRetry: () => void,
  doCancel: (reason?: unknown) => void,
];

/**
 * Token 刷新处理器
 * @param config 刷新配置
 * @returns UnauthorizedHandler
 */
export const refreshTokenHandler = ({
  getOldToken,
  getNewToken,
  refreshConfig,
  maxRetries = 1,
}: RefreshTokenConfig): UnauthorizedHandler => {
  // 记录正在刷新的token相关的回调
  const pendingRefresh = new Map<string, Array<PendingAction>>();
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
        pending.push([() => resolve(retry()), reject]);
      });
    }

    // 开始刷新token
    const callbacks: Array<PendingAction> = [];
    pendingRefresh.set(pendingKey, callbacks);

    try {
      const { fetchConfig } = refreshConfig;
      const { url, ...rest } = fetchConfig;
      const response = await fetch(
        new URL(url, window.location.origin).toString(),
        {
          ...rest,
          headers: {
            Authorization: `Bearer ${oldToken}`,
            ...rest.headers,
          },
        },
      );

      if (!response.ok) {
        throw new Error("刷新token失败");
      }

      if (refreshConfig.responseIsJson) {
        const data = await response.json();
        await refreshConfig.handleResponse(data);
      } else {
        await refreshConfig.handleResponse(response);
      }

      // 通知其他等待的请求
      callbacks.forEach(([doRetry]) => {
        doRetry();
      });
      return retry();
    } catch (e) {
      // 刷新失败，通知其他等待的请求
      callbacks.forEach(([, doCancel]) => {
        doCancel(e);
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
