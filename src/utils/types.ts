import type { LoadingFunction } from './loading';

/** HTTP请求配置 */
export interface FetchConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  data?: unknown;
  params?: Record<string, string>;
  [key: string]: unknown;
}

/** 通用请求选项 */
export interface CommonOptions {
  /** 是否开启loading层效果 */
  loading?: boolean;
  /** 是否展示错误信息 */
  errorMessageShow?: boolean;
  /** 是否使用API错误信息 */
  useApiErrorInfo?: boolean;
  /** 自定义Content-Type */
  contentType?: string;
  /** 额外的请求头 */
  moreHeaders?: Record<string, string>;
  /** 是否不需要token */
  withoutToken?: boolean;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 缓存时间（毫秒） */
  cacheTTL?: number;
}

/** JSON响应选项 */
export interface JsonOptions extends CommonOptions {
  responseIsJson: true;
}

/** 原始响应选项 */
export interface RawOptions extends CommonOptions {
  responseIsJson: false;
}

/** HTTP客户端配置 */
export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  refreshTokenConfig: {
    fetchConfig: FetchConfig;
    moreConfig?: Partial<CommonOptions>;
    handleResponse: (res: unknown) => void | Promise<void>;
  };
  getToken?: () => string;
  messageFunction?: {
    success?: (msg: string) => void;
    error?: (msg: string) => void;
  } | null;
  loadingFunction?: LoadingFunction | null;
  globalHeaders?: Record<string, string>;
  panicOrRestart?: () => never;
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