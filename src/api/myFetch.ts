import { message } from "antd";
import { newFetchRequest } from "../utils/fetchRequest";

const None = Symbol.for("None");

const {
  mainFetch: myFetch,
  resetLoadingTool,
  resetMessageTool,
} = newFetchRequest({
  baseUrl: import.meta.env.VITE_BASE_URL as string,
  timeout: 60 * 1000,
  refreshTokenUrl: {
    fetchConfig: {
      url: "/refresh-token",
      method: "POST",
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
  globalHeaders: {
    credentials: "same-origin",
    // credentials: "include",
  },
});

export { myFetch, resetLoadingTool, resetMessageTool };
