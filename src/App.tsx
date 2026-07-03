import type { RouteObject } from "react-router";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import LearnNewThings from "./LearnNewThings/index.tsx";
import "./styles/index.css";
import { Toast, toast } from "@heroui/react";
import { lazy, useEffect } from "react";
import { setMessageFunction as setMSg1 } from "./api/myFetch.ts";
import { setMessageFunction as setMSg2 } from "./api/testToken.ts";

const Bpp = lazy(() => import("./Bpp.tsx"));
const Base64 = lazy(() => import("./Base64.tsx"));
const Login = lazy(() => import("./Login.tsx"));
const LayoutWithAuth = lazy(() => import("./LayoutWithAuth.tsx"));
const NetworkTest = lazy(() => import("./test/NetworkTest.tsx"));

const routes: RouteObject[] = [
  {
    index: true,
    element: <Navigate to={`/network-test`} replace />,
  },
  {
    path: "network-test",
    element: <NetworkTest />,
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
  useEffect(() => {
    setMSg1({
      success: (msg: string) => {
        toast.success(msg);
      },
      error: (msg: string) => {
        toast.danger(msg);
      },
    });
    setMSg2({
      success: (msg: string) => {
        toast.success(msg);
      },
      error: (msg: string) => {
        console.error("testToken error:", msg);
        toast.danger(msg);
      },
    });
  }, []);

  return (
    <>
      <Toast.Provider placement="top" />
      <RouterProvider router={router} />
    </>
  );
};

export default App;
