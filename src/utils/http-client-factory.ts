import { message } from "antd";
import { HttpClient } from "./http-client";
import type { HttpClientConfig } from "./types";

/**
 * 默认配置
 */
const defaultConfig: Partial<HttpClientConfig> = {
  timeout: 60_000,
  messageFunction: {
    success: message.success,
    error: message.error,
  },
  handleError: (rawRes, _rawParams, resolve) => {
    message.error(`请求失败，状态码：【${rawRes.status}】【${rawRes.statusText}】`);
    resolve(Promise.reject(rawRes));
  },
};

/**
 * HttpClient 工厂类
 * 使用 Map 管理客户端实例，避免重复创建
 */
export class HttpClientFactory {
  static #clients = new Map<string, HttpClient>();

  /**
   * 创建或获取 HttpClient 实例
   * @param key 唯一键
   * @param config 客户端配置，会与默认配置合并
   * @returns HttpClient 实例
   */
  static createClient(key: string, config: Partial<HttpClientConfig>): HttpClient {
    if (this.#clients.has(key)) {
      console.warn(`HttpClientFactory: 客户端实例【${key}】已存在，返回已有实例`);
      return this.#clients.get(key)!;
    }

    const fullConfig: HttpClientConfig = {
      baseUrl: import.meta.env.VITE_BASE_URL as string,
      ...defaultConfig,
      ...config,
    };

    const client = new HttpClient(fullConfig);
    this.#clients.set(key, client);
    return client;
  }

  /**
   * 删除客户端实例
   * @param key 唯一键
   */
  static deleteClient(key: string) {
    return this.#clients.delete(key);
  }

  /**
   * 获取所有客户端键
   */
  static getClientKeys(): string[] {
    return Array.from(this.#clients.keys());
  }
}
