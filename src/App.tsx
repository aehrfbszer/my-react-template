import type { RouteObject } from "react-router";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import LearnNewThings from "./LearnNewThings/index.tsx";
import "./styles/index.css";
import { message } from "antd";
import { lazy, useEffect } from "react";
import { setMessageFunction } from "./api/myFetch.ts";

const Bpp = lazy(() => import("./Bpp.tsx"));
const Base64 = lazy(() => import("./Base64.tsx"));
const Login = lazy(() => import("./Login.tsx"));
const LayoutWithAuth = lazy(() => import("./LayoutWithAuth.tsx"));

export const routes: RouteObject[] = [
  {
    index: true,
    element: <Navigate to={`/${LearnNewThings.path}`} replace />,
  },
  {
    path: "hello",
    element: <Bpp />,
  },
  {
    path: "home",
    element: <Bpp />,
  },
  {
    path: "base",
    element: <Base64 />,
  },
  {
    path: "login",
    element: <Login />,
  },
  {
    path: "systemA",
    element: <LayoutWithAuth />,
    children: [
      {
        index: true,
        element: <Bpp />,
      },
      {
        path: "query",
        element: <Bpp />,
      },
      {
        path: "edit",
        element: <Bpp />,
      },
    ],
  },
  LearnNewThings,
  {
    path: "prefix",
    children: [
      {
        index: true,
        element: <Bpp />,
      },
      {
        path: "anything",
        element: <Bpp />,
      },
      {
        path: "*",
        element: <h1>404</h1>,
      },
    ],
  },
];

const router = createBrowserRouter(routes, {
  basename: import.meta.env.VITE_BASE_NAME,
});

const App = () => {
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    setMessageFunction({
      success: (msg: string) => {
        messageApi.success(msg);
      },
      error: (msg: string) => {
        messageApi.error(msg);
      },
    });
  }, [messageApi]);

  return (
    <>
      {contextHolder}
      <RouterProvider router={router} />
    </>
  );
};

export default App;
