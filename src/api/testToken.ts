import { message } from "antd";
import { bearerTokenHandler } from "../utils/auth-handlers";
import { HttpClient } from "../utils/http-client";
import { refreshTokenHandler } from "../utils/unauthorized-handler";
import type { AfterHandle } from "../utils/types";

/**
 * Token存储的key
 */
const TOKEN_KEY = "token";

/**
 * 获取token
 */
const getToken = () => localStorage.getItem(TOKEN_KEY);

const handler = refreshTokenHandler({
  getOldToken: getToken,
  getNewToken: getToken,
  refreshConfig: {
    fetchConfig: {
      url: `${import.meta.env.VITE_BASE_URL}/api/v1/refresh`,
      method: "POST",

      // 注意：这里不能带body，因为这里是初始化时一次性的，除非刷新页面，否则拿到的token永远是旧的，导致死循环
      // body: JSON.stringify({ token: getToken() }),
      // headers: {
      //   "Content-Type": "application/json",
      // },
    },
    responseIsJson: true,
    handleResponse: async (data) => {
      const { token } = data as { token: string };
      localStorage.setItem(TOKEN_KEY, token);
      // message.success("刷新登录成功");
    },
  },
  maxRetries: 3,
});

/**
 * 创建HTTP客户端实例
 */
const client = new HttpClient({
  baseUrl: import.meta.env.VITE_BASE_URL as string,
  timeout: 60_000,

  // 组合使用Bearer Token和API Key认证
  getDynamicHeaders: bearerTokenHandler(getToken),

  // globalFetchConfig: {
  //   headers: {
  //     "X-TEST-HEADER": "test-value", // 全局静态请求头示例
  //   },
  // },

  handleError: (rawRes, rawParams, resolve) => {
    if (rawRes.status === 401) {
      const [config, options, innerFetch] = rawParams;

      handler(config, () => resolve(innerFetch(config, options)), resolve).catch((e) => {
        message.error(
          `请求失败，未能刷新登录状态，请重新登录：${e instanceof Error ? `${e.message}` : String(e)}`,
        );
        resolve(Promise.reject(e));
      });
    } else {
      message.error(`请求失败：${rawRes.status} ${rawRes.statusText}`);
      resolve(rawRes.json());
    }
  },

  // 显示加载和错误消息
  messageFunction: {
    success: message.success,
    error: message.error,
  },
});

/**
 * 导出实例方法
 */
export const someFetch = client.fetch.bind(client);
export const setMessageFunction = client.setMessageFunction.bind(client);
export const setLoadingFunction = client.setLoadingFunction.bind(client);

export const afterHandle: AfterHandle = (handleRes) => (p1, p2) =>
  someFetch(p1, p2).then((res) => handleRes(res));

/**
 * 登录成功后调用此方法保存凭据
 */
export const saveCredentials = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * 清除所有凭据
 */
export const clearCredentials = () => {
  localStorage.clear();
};
