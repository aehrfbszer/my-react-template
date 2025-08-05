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
  getToken: () => localStorage.getItem("token") || "",
});

export { myFetch, resetLoadingTool, resetMessageTool };
