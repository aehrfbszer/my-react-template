import { lazy } from "react";
import Bpp from "../Bpp";
import { getMenus, type SubRoute } from "../Layout";

const NewHtml = lazy(() => import("./NewHtml.tsx"));
const WebGpuExample = lazy(() => import("./WebGpuExample.tsx"));
const Layout = lazy(() => import("../Layout.tsx"));
const LearnWepgpu = lazy(() => import("./LearnWebgpu.tsx"));
const subRoutes: SubRoute[] = [
  {
    name: "webgpu页面",
    index: true,
    element: <LearnWepgpu />,
  },
  {
    name: "高色域页面",
    path: "some-new-html",
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
