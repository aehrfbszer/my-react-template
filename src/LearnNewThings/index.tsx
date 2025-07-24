import Bpp from "../Bpp";
import Layout, { getMenus, type SubRoute } from "../Layout";
import NewHtml from "./NewHtml";
import WebGpuExample from "./WebGpuExample";

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
