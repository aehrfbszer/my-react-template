import type { AuthHeadersHandler, FetchConfig } from "./types";

/**
 * Bearer Token认证处理器
 * @param getToken 获取token的函数
 * @returns 认证处理器
 */
export const bearerTokenHandler = (
  getToken: () => string | undefined | null,
): AuthHeadersHandler => {
  return () => {
    const token = getToken();
    return token
      ? { Authorization: `Bearer ${token}` }
      : ({} as Record<string, string>);
  };
};

/**
 * Basic认证处理器
 * @param getCredentials 获取用户名和密码的函数
 * @returns 认证处理器
 */
export const basicAuthHandler = (
  getCredentials: () => { username: string; password: string },
): AuthHeadersHandler => {
  return () => {
    const { username, password } = getCredentials();
    const credentials = btoa(`${username}:${password}`);
    return { Authorization: `Basic ${credentials}` };
  };
};

/**
 * API Key认证处理器
 * @param getApiKey 获取API Key的函数
 * @param headerName API Key使用的header名称，默认为'X-API-Key'
 * @returns 认证处理器
 */
export const apiKeyHandler = (
  getApiKey: () => string,
  headerName = "X-API-Key",
): AuthHeadersHandler => {
  return () => ({ [headerName]: getApiKey() });
};

/**
 * 自定义认证处理器
 * @param handler 自定义的认证处理逻辑
 * @returns 认证处理器
 */
export const customHandler = (
  handler: (config: FetchConfig) => Record<string, string>,
): AuthHeadersHandler => {
  return handler;
};

// /**
//  * 组合多个认证处理器
//  * @param handlers 多个认证处理器
//  * @returns 组合后的认证处理器
//  */
// export const combineHandlers = (
//   ...handlers: AuthHeadersHandler[]
// ): AuthHeadersHandler => {
//   return (config) => {
//     return handlers.reduce((headers, handler) => {
//       return { ...headers, ...handler(config) };
//     }, {});
//   };
// };
