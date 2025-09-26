import { message } from "antd";
import { HttpClient } from "../utils/http-client";

const None = Symbol.for("None");

const client = new HttpClient({
  baseUrl: import.meta.env.VITE_BASE_URL as string,
  timeout: 60_000,
  refreshTokenConfig: {
    fetchConfig: {
      url: "/refresh-token",
      method: "POST",
    },
    moreConfig: {
      responseIsJson: false,
    },
    handleResponse: (res: unknown) => {
      const token = res ?? None;
      if (token !== None) {
        console.log("刷新token成功", token);
        localStorage.setItem("token", token as string);
      }
    },
  },
  panicOrRestart: () => {
    message.error("需要重新登录");
    location.href = "/login";
    throw new Error("需要重新登录");
  },
  getToken: () => localStorage.getItem("token") || "",
});

export { client };
export const myFetch = client.fetch.bind(client);
export const setMessageFunction = client.setMessageFunction.bind(client);
export const setLoadingFunction = client.setLoadingFunction.bind(client);
