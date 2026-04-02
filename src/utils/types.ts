import type { LoadingFunction } from "./loading";

/** HTTP请求配置 */
export interface FetchConfig extends RequestInit {
  /**
   * 注意：JS原生URL构造函数的行为。
   * 1. 如果config.url是一个绝对URL（包含协议和host），则会直接使用这个URL，忽略HttpClient构造函数中的baseUrl配置
   * 2. 如果config.url是一个相对URL，则会将HttpClient构造函数中的baseUrl作为基础URL进行拼接，最终请求URL = baseUrl + config.url
   * 3. config.url中的pathname/search/hash部分会被保留并参与最终URL的构建
   */
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  /**
   * 当data为普通object时，里面值为undefined的属性会被自动删除（JSON.stringify干的）
   */
  data?: RequestInit["body"] | object;
  /**
   * object里面的某个值为undefined的属性会被转成【字符串的undefined】（new URLSearchParams(config.params).toString()干的）
   */
  params?: Record<string, string>;
  /**
   * 请求ID，关联请求和刷新token的过程，便于调试和日志记录
   */
  requestId?: string;
}

/**
 * 通用请求选项
 * 会覆盖全局配置（包括静态全局配置和动态全局配置）
 */
export interface CommonOptions<J extends boolean> {
  /** 是否开启loading层效果，默认【true】 */
  loading: boolean;

  /** 是否展示错误信息，默认【true】 */
  errorMessageShow: boolean;

  /** 清除某些全局headers
   * 例如：全局静态/动态请求头设置了Authorization，如果该接口不需要Authorization，可以在这里配置 `["Authorization"]`
   * 默认【null】
   * http规范对于请求头键值对中的键是不区分大小写的，所以这里的大小写功能应该都能正确处理，这里是js原生Headers对象的能力
   * 如需想要覆盖全局静态/动态请求头或者新加额外请求头，直接加在原生fetch的第一个参数里面的headers配置项即可，用户的headers配置项会覆盖全局静态/动态/默认请求头
   */
  clearHeaders: string[] | null;

  /** 清除所有全局headers
   * 默认【false】
   * 例如：全局静态/动态请求头设置了Authorization，如果该接口不需要Authorization，可以开启此选项
   * 如需想要覆盖全局静态/动态请求头或者新加额外请求头，直接加在原生fetch的第一个参数里面的headers配置项即可，用户的headers配置项会覆盖全局静态/动态/默认请求头
   */
  clearAllHeaders?: boolean;

  /**
   * 不携带全局动态请求头
   * 【默认：false】
   * 例如：全局动态请求头设置了Authorization，如果该接口不需要Authorization，可以开启此选项
   */
  withoutGlobalDynamicHeaders: boolean;

  /**
   * 响应是否解析为JSON，默认【true】
   * 如果为false，则fetch方法的返回值是原始的Response对象，由调用方决定如何处理响应体
   * 如果为true，则fetch方法会自动调用response.json()并返回解析后的数据
   * 注意：如果接口响应的Content-Type不是application/json，或者响应体不是有效的JSON字符串，且responseIsJson为true，则会导致解析失败并抛出错误
   */
  responseIsJson: J;
}

/**
 * 某些全局headers需要动态生成/获取
 * 例如：用于生成请求认证相关的headers
 */
export type DynamicHeadersHandler = (config: FetchConfig) => Record<string, string>;

/**
 * 注意rawParams中的config: FetchConfig里面会保留原始signal/默认signal，如果继续透传使用，超时是按第一次触发的开始时间算起。或许你有替换成新的signal的需求？
 */
export type HandleErrorFunction = <T, J extends boolean>(
  rawRes: Response,
  rawParams: [
    config: FetchConfig,
    options: Required<CommonOptions<J>>,
    innerFetch: (config: FetchConfig, options: Required<CommonOptions<J>>) => Promise<T>,
  ],
  resolve: (value: T | Promise<T>) => void,
) => void;

export type MessageFunction = {
  success?: (msg: string) => void;
  error?: (msg: string) => void;
};

/** HTTP客户端配置 */
export interface HttpClientConfig {
  /**
   * 接口基础URL，最终请求URL = baseUrl + config.url；
   * js原生URL构造函数的行为。
   * 注意：baseUrl只有origin部分会被使用，pathname/search/hash部分会被忽略
   */
  baseUrl: string;
  /**
   * 接口超时时间，超时后会中断请求，单位毫秒，默认0表示不超时
   */
  timeout?: number;
  messageFunction?: MessageFunction | null;
  loadingFunction?: LoadingFunction | null;
  globalFetchConfig?: RequestInit;
  getDynamicHeaders?: DynamicHeadersHandler;
  handleError?: HandleErrorFunction;
}
