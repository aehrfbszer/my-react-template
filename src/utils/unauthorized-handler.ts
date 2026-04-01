import type { FetchConfig } from "./types";

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
    fetchConfig: Omit<FetchConfig, "data" | "params">; // 刷新请求的配置，data和params不支持，请传入fetch原生的body
    responseIsJson: boolean; // 是否将响应解析为JSON
    handleResponse: (res: unknown) => void | Promise<void>;
  };
  /** 最大重试次数
   * 这个指的是刷新token的最大重试次数，不是请求本身的重试次数；当达到最大重试次数时，后续请求将不会再尝试刷新token，而是直接失败，通常会提示用户重新登录
   */
  maxRetries?: number;
}

type PendingAction = [doRetry: () => void, doCancel: (reason?: unknown) => void];

export const refreshTokenHandler = ({
  getOldToken,
  getNewToken,
  refreshConfig,
  maxRetries = 1,
}: RefreshTokenConfig) => {
  // 记录正在刷新的token相关的回调
  const pendingRefresh = new Map<string, Array<PendingAction>>();
  // 记录重试次数
  const retryCounts = new Map<string, number>();

  return async <T = Response>(
    config: FetchConfig,
    retry: () => void,
    resolve: (value: T | Promise<T>) => void,
  ): Promise<void> => {
    const oldToken = getOldToken();
    if (!oldToken) {
      throw new Error("未登录");
    }

    console.warn(
      `请求${config.url}返回401，开始刷新token，旧token: ${oldToken}, 请求ID: ${config.requestId}`,
    );

    // 使用请求URL作为重试计数的key
    const retryKey = config.requestId || `${config.method}:${config.url}`;
    const currentRetries = retryCounts.get(retryKey) ?? 0;

    console.warn(
      `请求ID: ${config.requestId}, 当前刷新token重试次数: ${currentRetries}, 刷新token最大重试次数: ${maxRetries},请求本身的重试次数: ${currentRetries + 1}`,
    );

    if (currentRetries >= maxRetries) {
      retryCounts.delete(retryKey);
      throw new Error("超过最大重试次数");
    }

    retryCounts.set(retryKey, currentRetries + 1);

    // 检查token是否已经被其他请求更新
    const newToken = getNewToken();
    if (newToken && newToken !== oldToken) {
      retry();
      return;
    }

    // 如果已经有请求在刷新，等待其完成
    const pendingKey = oldToken;
    const pending = pendingRefresh.get(pendingKey);
    if (pending) {
      pending.push([() => retry(), (err) => resolve(Promise.reject(err))]);
      return;
    }

    // 开始刷新token
    const callbacks: Array<PendingAction> = [];
    pendingRefresh.set(pendingKey, callbacks);

    try {
      const { fetchConfig } = refreshConfig;
      const { url, ...rest } = fetchConfig;
      const response = await fetch(new URL(url, window.location.origin).toString(), {
        ...rest,
        headers: {
          Authorization: `Bearer ${oldToken}`,
          ...rest.headers,
        },
      });

      if (!response.ok) {
        throw new Error("刷新token失败");
      }

      console.log(`刷新token成功, 请求ID: ${config.requestId}`);

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
