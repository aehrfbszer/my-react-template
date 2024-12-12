const removeAllItem = () => {
  localStorage.clear();
  sessionStorage.clear();
};

export interface EachRequestCustomOptions<T extends boolean = true> {
  /**【默认：false】 是否开启取消进行中的重复请求(舍弃旧的,舍弃时报error), 默认为 false，默认判断依据为url，method, params，data相同为重复*/
  repeat_request_cancel: boolean;

  /**【默认：true】是否开启loading层效果,首先需要传loading实例进来*/
  loading: boolean;

  /** 【默认：true】是否展示接口错误信息，首先需要传message实例进来*/
  error_message_show: boolean;

  /** 【默认：true】直接使用接口的报错信息，尝试获取接口错误信息失败则根据err code尝试使用通用错误处理，先要开启error_message_show*/
  use_api_error_info: boolean;

  /**【默认：false】针对repeat_request_cancel为true时，忽略判断逻辑中的params和data */
  repeat_ignore_params: boolean;

  /**【默认：undefined】针对repeat_request_cancel为true时，直接忽略默认判断逻辑，使用该参数作为key区分是否重复*/
  repeat_danger_key?: string;

  /**【默认：false】当error_message_show为true，但又不想展示repeat_request_cancel的错误提示时*/
  repeat_error_ignore: boolean;

  /**【默认：false】不需要token*/
  withoutToken: boolean;

  /** 【默认：true】认为返回数据是json，解析json数据后返回，否则不处理直接返回原始response */
  responseIsJson: T;
}

type Method =
  | "get"
  | "GET"
  | "delete"
  | "DELETE"
  | "head"
  | "HEAD"
  | "options"
  | "OPTIONS"
  | "post"
  | "POST"
  | "put"
  | "PUT"
  | "patch"
  | "PATCH"
  | "purge"
  | "PURGE"
  | "link"
  | "LINK"
  | "unlink"
  | "UNLINK";

export type keyConfig = {
  url: string;
  method: Method;
  params?: string;
  data?: string;
};

/***
 * @description: 生成唯一的每个请求的唯一key
 */
function getPendingKey(
  config: keyConfig,
  noParams = false,
  dangerCancelKey?: string,
) {
  const { url, method, params, data } = config;
  if (dangerCancelKey) {
    return dangerCancelKey;
  }
  if (noParams) return [url, method].join("&");
  else return [url, method, params, data].join("&");
}

export interface FetchConfig {
  url: string;
  method: Method;
  /** URLSearchParams=> "application/x-www-form-urlencoded"；
   * data为object=>"application/json"；
   * FormData=>"multipart/form-data" */
  data?: Record<string, unknown> | FormData | URLSearchParams;
  /** 由于参数是在params中，所以键值对中的值没有必要允许number，请提前转成数字字符 */
  params?: {
    [key: string]: string | undefined;
  };

  [key: string]: unknown;
}
const reloadPage = () => {
  removeAllItem();
  window.location.href = `${window.location.origin}/login`;
  location.reload();
  throw new Error("无法处理，刷新页面，这个错误不应该log出来");
};

export const newFetchRequest = ({
  baseUrl,
  timeout = 60 * 1000,
  loginUrl,
  refreshTokenUrl,
  withoutTokenUrls = [],
  getToken,
  handleMessage = null,
  loadingFunction = null,
  extraConfig = {
    loginNeedToken: false,
    refreshTokenNeedToken: true,
  },
  panicOrRestart = reloadPage,
}: {
  baseUrl: string;
  timeout?: number;
  loginUrl: string;
  refreshTokenUrl: {
    fetchConfig: FetchConfig;
    setToken: (res: unknown) => void;
  };
  withoutTokenUrls?: Array<string>;
  getToken: () => string;
  handleMessage?: null | {
    success?: (msg: string) => void;
    error?: (msg: string) => void;
  };
  loadingFunction?: null | {
    start?: () => void;
    finish?: () => void;
    error?: () => void;
  };
  extraConfig?: {
    loginNeedToken: false;
    refreshTokenNeedToken: true;
  };
  panicOrRestart?: () => never;
}) => {
  const resetLoadingTool = (instance: {
    start?: () => void;
    finish?: () => void;
    error?: () => void;
  }) => {
    loadingFunction = instance;
  };

  const resetMessageTool = (instance: {
    success?: (msg: string) => void;
    error?: (msg: string) => void;
  }) => {
    handleMessage = instance;
  };

  const pendingCountObj: {
    [key: string]: number;
  } = {};

  const LoadingInstance = {
    _count: 0,
  };
  const pendingArrMap: Map<string, Array<() => void>> = new Map();

  const noTokenUrls = [...withoutTokenUrls];
  if (!extraConfig.loginNeedToken) {
    noTokenUrls.push(loginUrl);
  }
  if (!extraConfig.refreshTokenNeedToken) {
    noTokenUrls.push(refreshTokenUrl.fetchConfig.url);
  }

  async function mainFetch<U, T extends boolean = true>(
    fetchConfig: FetchConfig,
    customOptions?: Partial<EachRequestCustomOptions<T>>,
    count = 0,
  ): Promise<T extends true ? U : Response> {
    const controller = new AbortController();
    const signal = controller.signal;

    type returnType = T extends true ? U : Response;

    const myOptions: EachRequestCustomOptions<T> = Object.assign(
      {
        repeat_request_cancel: false,
        loading: true,
        error_message_show: true,
        use_api_error_info: true,
        repeat_ignore_params: false,
        // repeat_danger_key: undefined,
        repeat_error_ignore: false,
        withoutToken: false,
        responseIsJson: true,
      },
      customOptions,
    );

    const token = getToken();

    try {
      const url = fetchConfig.url.startsWith("http")
        ? fetchConfig.url
        : `${baseUrl}${fetchConfig.url}`;
      const config: {
        signal: AbortSignal;
        method: Method;
        headers: {
          Authorization?: string;
          "Content-Type"?: string;
        };
        body?: string | URLSearchParams | FormData;
      } = {
        signal: signal,
        method: fetchConfig.method, // *GET, POST, PUT, DELETE, etc.
        headers: {},
      };
      // 自动携带token
      if (
        token &&
        !noTokenUrls.some((noUrl) => url.includes(noUrl)) &&
        !myOptions.withoutToken
      ) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      if (fetchConfig.data) {
        if (
          fetchConfig.data instanceof FormData ||
          fetchConfig.data instanceof URLSearchParams
        ) {
          //  Fetch 标准规定如果 body 是一个 URLSearchParams 对象，那么它应该序列化为 application/x-www-form-urlencoded
          // FormData同理multipart/form-data，所以不需要设置Content-Type
          config.body = fetchConfig.data;
        } else {
          config.headers["Content-Type"] = "application/json";
          config.body = JSON.stringify(fetchConfig.data);
        }
      }

      let urlParams = "";
      let finalUrl = url;

      if (fetchConfig.params) {
        // json来回一遍是为了过滤undefined字段
        const filterParams: Record<string, string> = JSON.parse(
          JSON.stringify(fetchConfig.params),
        );
        urlParams = new URLSearchParams(filterParams).toString();
        finalUrl = `${url}?${urlParams}`;
      }

      const cancelRequest = (reason: string) => controller.abort(reason);

      // 创建loading实例
      if (myOptions.loading) {
        LoadingInstance._count++;
        if (LoadingInstance._count === 1) {
          loadingFunction?.start?.();
        }
      }

      // 这里是同步代码，发出了请求
      const doRequest = fetch(finalUrl, config);

      const cancelTimer = setTimeout(() => {
        cancelRequest("请求超时！");
      }, timeout);

      let countThing: () => void | undefined;

      // 这里算是性能优化
      if (myOptions.repeat_request_cancel) {
        const pendingKey = getPendingKey(
          {
            url: url,
            method: fetchConfig.method,
            params: urlParams,
            // 警告：FormData没什么好方法tostring，直接toString是'[object FormData]'，所以会比不出来区别
            data: config.body?.toString(),
          },
          myOptions.repeat_ignore_params,
          myOptions.repeat_danger_key,
        );

        pendingCountObj[pendingKey] ??= 0;
        pendingCountObj[pendingKey] += 1;
        if (pendingCountObj[pendingKey] > 1) {
          // 只有请求发出了，取消请求才有意义，就是上面要写const doRequest = fetch(finalUrl, config)的意义
          cancelRequest("重复的请求");
        }
        countThing = () => {
          pendingCountObj[pendingKey] -= 1;
          if (pendingCountObj[pendingKey] === 0) {
            delete pendingCountObj[pendingKey];
          }
        };
      }

      // finally为这个请求做一些原子化操作
      const response = await doRequest.finally(() => {
        countThing?.();
        if (myOptions.loading) {
          if (LoadingInstance._count > 0) LoadingInstance._count--;
        }
        // 一、断网了、重复请求导致取消了，但定时器没关，所以在这里关一下
        // 二、如果是超时导致取消，那定时器已经执行完了，clear也没什么必要，但clear也不会报错
        // 三、正常响应(包括200、403等状态对fetch都是正常响应)，说明响应已经结束了，cancel请求不可能生效了，但clear清一下内存也行
        clearTimeout(cancelTimer);
      });

      if (response.ok) {
        if (myOptions.loading) {
          if (LoadingInstance._count === 0) {
            loadingFunction?.finish?.();
          }
        }

        if (myOptions.responseIsJson) {
          try {
            return await response.json();
          } catch (e) {
            const text = "返回的不是json格式，考虑设置responseIsJson为false";
            console.error(text);
            console.groupCollapsed();
            console.log(e);
            console.groupEnd();
            handleMessage?.error?.(text);
            return Promise.reject(text);
          }
        } else {
          return response as returnType;
        }
      } else {
        /**
         * 进到这个else里，说明response的status code不是200-299，需要进行错误处理
         * 错误其实只分两种一种token过期，一种其他错误。
         *
         * 其中token过期分两种，一种是已经尝试了刷新token，但刷新token的接口结果失败了，那就清缓存，返回登录页
         * 另一种在刷新过程中，保存其他请求，等待新token进行重试。
         *
         * 其他错误那就直接正常抛出给外部代码
         */

        // 尝试刷新token失败了，返回错误让上一层处理(其实这里处理也行)
        if (url.includes(refreshTokenUrl.fetchConfig.url)) {
          try {
            const errInfo = await response.json();
            console.log("登录失效", errInfo);
            handleMessage?.error?.("登录失效");
            return Promise.reject(
              new Error("刷新token失败", {
                cause: errInfo,
              }),
            );
          } catch (e) {
            // 错误不是json,且已经用了json方法，数据流被消耗，无法再次用类似text等方法读取
            console.error(
              "错误不是json,且已经用了json方法，数据流被消耗，无法再次用类似text等方法读取",
            );
            console.groupCollapsed();
            console.log(e);
            console.groupEnd();
            return Promise.reject(new Error("刷新token失败"));
          }
        }
        // 接口返回401，说明信息过期，尝试去刷新token
        else if (response.status === 401) {
          // 这里的情况count一般都是0，如果count大于0，那就是刷新token成功了，但请求接口还是401，说明count大于0是后端逻辑错误
          if (count < 3) {
            // 把请求保存下来，但还不执行
            const onceAgainRequest = () =>
              mainFetch<U, T>(fetchConfig, customOptions, count + 1);
            // 看一下有没有新token
            const nowToken = getToken();
            if (nowToken && nowToken !== token) {
              // 新token有了，直接重试请求
              return onceAgainRequest();
            }
            /**
             * 到了这里，说明没有新token，那么将请求保存下来。
             * 本代码逻辑是一段时间内只会有一个请求去尝试刷新token，其他同样过期的其他请求，暂时保存在数组里，等待token刷新成功
             */
            // 这里看看是否已经针对旧的token在请求刷新token了
            const arr = pendingArrMap.get(token);
            // 进到if里，说明已经在尝试刷新了
            if (arr) {
              // 返回一个Promise，让外部代码保持pending状态，让外部代码无感知，认为只是一次请求等久一点而已，并没有重试
              const { promise, resolve } =
                Promise.withResolvers<T extends true ? U : Response>();

              // arr中存待执行的请求（在arr中请求执行后，返回的请求结果会被resolve出来，外部代码无感知）
              arr.push(() => {
                resolve(onceAgainRequest());
              });

              return promise;
            }
            // 进到else里，说明这个请求是第一个401请求，此处来刷新token
            else {
              const pendingArr: Array<() => void> = [];
              pendingArrMap.set(token, pendingArr);

              try {
                const tokenRes = await mainFetch(refreshTokenUrl.fetchConfig);
                refreshTokenUrl.setToken(tokenRes);
                // const oldArr = pendingArrMap.get(token)
                // oldArr?.forEach((cb) => {
                //     cb()
                // })
                pendingArr.forEach((cb) => {
                  cb();
                });
                pendingArrMap.delete(token);
                // 把这个第一个401请求返回
                return onceAgainRequest();
              } catch (e) {
                console.log(e);
                handleMessage?.error?.("登录失效");
                return panicOrRestart();
              }
            }
          }
          // 超过3次，需要前端兜底，防止无限重试，直接退出登录
          else {
            console.error("多次刷新token成功，但接口仍是401");
            handleMessage?.error?.("登录失效");
            return panicOrRestart();
          }
        }
        // 下面的else里面是接口返回的普通错误，直接外抛给外部代码
        else {
          if (myOptions.loading) {
            if (LoadingInstance._count === 0) {
              loadingFunction?.error?.();
            }
          }

          try {
            // 不一定是object，也可能是number，string等，这些都是符合json标准
            const errJson = await response.json();

            if (myOptions.error_message_show) {
              // 当成obj，具体逻辑让后面处理
              const errObj = myOptions.use_api_error_info ? errJson : undefined;
              const msg = httpErrorStatusHandle(
                response,
                errObj,
                panicOrRestart,
              ); // 处理错误状态码
              if (msg) {
                handleMessage?.error?.(`【${response.status}】${msg}`);
              }
            }

            return Promise.reject(errJson);
          } catch {
            return Promise.reject([
              response,
              "错误不是json,且已经用了json方法，数据流被消耗，无法再次用类似text等方法读取",
            ]);
          }
        }
      }
    } catch (error: unknown) {
      console.groupCollapsed();
      console.error(
        "请求失败了，取消请求(超时、重复)与网络错误是正常的，无法处理",
      );
      console.error(error);
      console.error("其他情况不是预期的错误，需要开发者注意");
      console.groupEnd();

      if (myOptions.loading) {
        if (LoadingInstance._count === 0) {
          loadingFunction?.error?.();
        }
      }

      const msg = signal.reason;

      const finalMsg = msg || "请求失败，请检查网络";
      handleMessage?.error?.(finalMsg);

      return Promise.reject("请求失败");
    }
  }

  return {
    mainFetch,
    resetLoadingTool,
    resetMessageTool,
  };
};

/***
 * @description: 处理异常
 * @param response
 * @param errObj
 * @param panicOrRestart
 * @return string
 */
export function httpErrorStatusHandle(
  response: Response,
  errObj?: unknown,
  panicOrRestart?: () => never,
) {
  let msg = "";
  if (response.status) {
    switch (response.status) {
      case 302:
        msg = "接口重定向了！";
        break;
      case 400:
        msg = "参数不正确！";
        break;
      case 401:
        // 已经在上面的代码处理了，进不到这里
        msg = "您未登录，或者登录已经超时，请先登录！";
        if (panicOrRestart) return panicOrRestart?.();
        break;
      case 403:
        msg = "您没有权限操作！";
        break;
      case 404:
        msg = "对象不存在";
        break;
      case 408:
        msg = "请求超时！";
        break;
      case 409:
        msg = "系统已存在相同数据！";
        break;
      case 500:
        msg = "服务器内部错误！";
        break;
      case 501:
        msg = "服务未实现！";
        break;
      case 502:
        msg = "网关错误！";
        break;
      case 503:
        msg = "服务不可用！";
        break;
      case 504:
        msg = "服务暂时无法访问，请稍后再试！";
        break;
      case 505:
        msg = "HTTP版本不受支持！";
        break;
      default:
        msg = "异常问题，请联系管理员！";
    }
  }
  if (errObj) {
    if (typeof errObj === "object") {
      const obj = errObj as Record<string, unknown>;
      const text =
        obj["errorMessage"] || obj["message"] || obj["msg"] || obj["error"];
      if (text) {
        msg = typeof text === "string" ? text : JSON.stringify(text);
      }
    } else {
      msg = typeof errObj === "string" ? errObj : JSON.stringify(errObj);
    }
  }
  return msg;
}

export type FetchRequest = ReturnType<typeof newFetchRequest>;
