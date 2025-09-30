import type { HttpError } from "./errors";
import type { LoadingFunction } from "./loading";

/** HTTP请求配置 */
export interface FetchConfig extends RequestInit {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  data?: RequestInit["body"] | object;
  params?: Record<string, string>;
}

/**
 * 通用请求选项
 * 会覆盖全局配置（包括静态全局配置和动态全局配置）
 */
export interface CommonOptions {
  /** 是否开启loading层效果，默认【true】 */
  loading: boolean;

  /** 是否展示错误信息，默认【true】 */
  errorMessageShow: boolean;

  /** 是否使用API错误信息，默认【true】 */
  useApiErrorInfo: boolean;

  /** 自定义Content-Type，默认【""】 */
  contentType: string;

  /** 额外的请求头
   * 默认【null】
   * 如果和上面的 `contentType` 有冲突，则以 `moreHeaders` 为准
   */
  moreHeaders: Record<string, string> | null;

  /** 清除某些全局headers
   * 默认【null】
   * 例如：全局静态/动态请求头设置了Authorization，如果该接口不需要Authorization，可以在这里配置 `["Authorization"]`
   */
  clearHeaders: string[] | null;

  /** 清除所有全局headers
   * 默认【false】
   * 例如：全局静态/动态请求头设置了Authorization，如果该接口不需要Authorization，可以开启此选项
   */
  clearAllHeaders?: boolean;

  /**
   * 不携带全局动态请求头
   * 【默认：false】
   * 例如：全局动态请求头设置了Authorization，如果该接口不需要Authorization，可以开启此选项
   */
  withoutGlobalDynamicHeaders: boolean;

  /** 是否启用缓存，慎用，绝大多数情况是不需要开启的
   * 默认【false】
   * 仅支持GET请求
   * 如果响应头中包含 `Cache-Control: no-cache` 或 `Cache-Control: no-store` 则不同样会缓存
   */
  cache: boolean;

  /** 缓存时间（毫秒）
   * 默认【5分钟】
   */
  cacheTTL: number;
}

/** JSON响应选项 */
export interface JsonOptions extends CommonOptions {
  responseIsJson: true;
}

/** 原始响应选项 */
export interface RawOptions extends Partial<CommonOptions> {
  responseIsJson: false;
}

/**
 * 某些全局headers需要动态生成/获取
 * 例如：用于生成请求认证相关的headers
 */
export type DynamicHeadersHandler = (
  config: FetchConfig,
) => Record<string, string>;

export type UnauthorizedHandler = <T>(
  error: HttpError,
  config: FetchConfig,
  retry: () => Promise<T>,
) => Promise<T>;

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
  panicOrRestart?: () => never;
  getDynamicHeaders?: DynamicHeadersHandler;
  onUnauthorized?: UnauthorizedHandler;
}

/** 基础响应结构 */
export interface BaseResponse<T> {
  data: T;
  code: number;
  message?: string;
}

/** 分页响应结构 */
export interface PageResponse<T> extends BaseResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
