import type { RouteObject } from "react-router";
import Layout, { getMenus, type SubRoute } from "../Layout";
import Bpp from "../Bpp";
import WebGpuExample from "./WebGpuExample";

const subRoutes: SubRoute[] = [
  {
    name: "index页面",
    index: true,
    element: <Bpp />,
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

export const path = "webgpu";

const subPage: RouteObject = {
  path,
  element: <Layout menus={getMenus(path, subRoutes)} />,
  children: subRoutes,
};

export default subPage;
