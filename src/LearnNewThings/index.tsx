import Bpp from "../Bpp";
import { getMenus, type SubRoute } from "../Layout";
import { lazy } from "react";

const NewHtml = lazy(() => import("./NewHtml.tsx"));
const WebGpuExample = lazy(() => import("./WebGpuExample.tsx"));
const Layout = lazy(() => import("../Layout.tsx"));

const subRoutes: SubRoute[] = [
  {
    name: "index页面",
    index: true,
    element: <NewHtml />,
  },
  {
    name: "apple页面",
    path: "apple",
    element: <Bpp />,
  },
  {
    name: "banana页面",
    path: "banana",
    element: <Bpp />,
  },
  {
    name: "webgpu学习",
    path: "example",
    element: <WebGpuExample />,
  },
];

export const path = "lets-learn";

const subPage: SubRoute = {
  name: "一些WebGPU相关",
  path,
  element: <Layout menus={getMenus(path, subRoutes)} />,
  children: subRoutes,
};

export default subPage;
