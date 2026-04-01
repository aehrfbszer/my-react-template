import type { LoadingFunction } from "./loading";

/** HTTP请求配置 */
export interface FetchConfig extends RequestInit {
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
   * 默认【null】
   * 例如：全局静态/动态请求头设置了Authorization，如果该接口不需要Authorization，可以在这里配置 `["Authorization"]`
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
  baseUrl: string;
  timeout?: number;
  messageFunction?: MessageFunction | null;
  loadingFunction?: LoadingFunction | null;
  globalFetchConfig?: RequestInit;
  getDynamicHeaders?: DynamicHeadersHandler;
  handleError?: HandleErrorFunction;
}
