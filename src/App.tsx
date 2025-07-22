import Bpp from "./Bpp.tsx";
import {
  BrowserRouter,
  Navigate,
  Route,
  RouterProvider,
  Routes,
  createBrowserRouter,
} from "react-router";
import Layout from "./Layout.tsx";
import Login from "./Login.tsx";
import LayoutWithAuth from "./LayoutWithAuth.tsx";
import Base64 from "./Base64.tsx";
import type { RouteObject } from "react-router";
import WebGpu from "./WebGpu";

const AnotherRouterStyle = (
  <BrowserRouter>
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
  </BrowserRouter>
);
console.log(AnotherRouterStyle, "AnotherRouterStyle");

export const routes: RouteObject[] = [
  {
    index: true,
    element: <Navigate to="/show" replace />,
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
  WebGpu,
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

const App = () => <RouterProvider router={router} />;

export default App;
