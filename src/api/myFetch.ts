import { newFetchRequest } from "../utils/fetchRequest";

const {
  mainFetch: myFetch,
  resetLoadingTool,
  resetMessageTool,
} = newFetchRequest({
  baseUrl: import.meta.env.VITE_BASE_URL as string,
  timeout: 60 * 1000,
  loginUrl: "/login",
  refreshTokenUrl: {
    fetchConfig: {
      url: "/refreshToken",
      method: "POST",
    },
    setToken: (res: unknown) => {
      if (res) {
        localStorage.setItem("token", res as string);
      }
    },
  },
  getToken: () => localStorage.getItem("token") || "",
});

export { myFetch, resetLoadingTool, resetMessageTool };
