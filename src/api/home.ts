import { myFetch } from "./myFetch.ts";

export const getHomeList = (params: { fasd: string }) => {
  return myFetch<{ ds: number }>({
    url: "/users/all",
    method: "POST",
    params,
  });
};
