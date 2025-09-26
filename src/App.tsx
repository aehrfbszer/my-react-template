import type { RouteObject } from "react-router";
import {
  BrowserRouter,
  createBrowserRouter,
  Navigate,
  Route,
  RouterProvider,
  Routes,
} from "react-router";
import LearnNewThings from "./LearnNewThings/index.tsx";
import "./styles/index.css";
import { message, Spin } from "antd";
import { lazy, Suspense, useEffect } from "react";
import { setMessageFunction } from "./api/myFetch.ts";

const Layout = lazy(() => import("./Layout.tsx"));
const Bpp = lazy(() => import("./Bpp.tsx"));
const Base64 = lazy(() => import("./Base64.tsx"));
const Login = lazy(() => import("./Login.tsx"));
const LayoutWithAuth = lazy(() => import("./LayoutWithAuth.tsx"));

const AnotherRouterStyle = (
  <BrowserRouter>
    <Suspense fallback={<Spin spinning={true}>Loading...</Spin>}>
      <Routes>
        <Route index element={<Navigate to="/base" replace />} />
        <Route path="hello" element={<Bpp />} />
        <Route path="home" element={<Bpp />} />
        <Route path="base" element={<Base64 />} />

        <Route path="login" element={<Login />} />

        <Route path="systemA" element={<LayoutWithAuth />}>
          <Route index element={<Bpp />} />
          <Route path="query" element={<Bpp />} />
          <Route path="edit" element={<Bpp />} />
        </Route>

        <Route path="fruit" element={<Layout />}>
          <Route index element={<Bpp />} />
          <Route path="apple" element={<Bpp />} />
          <Route path="banana" element={<Bpp />} />
        </Route>

        {/*只是前缀*/}
        <Route path="prefix">
          <Route index element={<Bpp />} />
          <Route path="anything" element={<Bpp />} />
        </Route>
        <Route path="*" element={<h1>404</h1>} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
console.log(AnotherRouterStyle, "AnotherRouterStyle");

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
      <RouterProvider router={router} />;
    </>
  );
};

export default App;
