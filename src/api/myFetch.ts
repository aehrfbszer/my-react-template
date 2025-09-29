import { message } from "antd";
import { bearerTokenHandler } from "../utils/auth-handlers";
import { HttpClient } from "../utils/http-client";
import { refreshTokenHandler } from "../utils/unauthorized-handler";

/**
 * Token存储的key
 */
const TOKEN_KEY = "token";

/**
 * API Key存储的key
 */
const API_KEY = "api-key";

/**
 * 获取token
 */
const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * 获取API Key
 */
// const getApiKey = () => localStorage.getItem(API_KEY) ?? "";

/**
 * 创建HTTP客户端实例
 */
const client = new HttpClient({
  baseUrl: import.meta.env.VITE_BASE_URL as string,
  timeout: 60_000,

  // 组合使用Bearer Token和API Key认证
  getAuthHeaders: bearerTokenHandler(getToken),

  onUnauthorized: refreshTokenHandler({
    getOldToken: getToken,
    getNewToken: getToken,
    refreshConfig: {
      fetchConfig: {
        url: `${import.meta.env.VITE_BASE_URL}/refresh-token`,
        method: "POST",
      },
      responseIsJson: true,
      handleResponse: async (data) => {
        const { token } = data as { token: string };
        localStorage.setItem(TOKEN_KEY, token);
        message.success("刷新登录成功");
      },
    },
    maxRetries: 3,
  }),

  // 显示加载和错误消息
  messageFunction: {
    success: message.success,
    error: message.error,
  },
});

/**
 * 导出实例方法
 */
export const myFetch = client.fetch.bind(client);
export const setMessageFunction = client.setMessageFunction.bind(client);
export const setLoadingFunction = client.setLoadingFunction.bind(client);

/**
 * 登录成功后调用此方法保存凭据
 */
export const saveCredentials = (token: string, apiKey: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(API_KEY, apiKey);
};

/**
 * 清除所有凭据
 */
export const clearCredentials = () => {
  localStorage.clear();
};
