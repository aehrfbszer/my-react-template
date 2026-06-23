import { Link, Outlet, useLocation, type RouteObject } from "react-router";
import React, { createContext } from "react";
import "./Layout.css";

// Context最好是单文件导出，不要和组件一起导出
const SomeContext = createContext<{ aa?: number }>({});

interface LayoutProps {
  menus?: {
    label: React.JSX.Element;
    key: string;
  }[];
}

const Layout = ({ menus }: LayoutProps) => {
  const location = useLocation();
  console.log("Layout rendered with menus:", menus, location.pathname);

  return (
    <div className="layout-container">
      {menus ? (
        // <Menu selectedKeys={[location.pathname]} mode="horizontal" items={menus} />
        <nav>
          <ul>
            {menus.map((me) => (
              <li key={me.key}>{me.label}</li>
            ))}
          </ul>
        </nav>
      ) : null}
      <SomeContext value={{ aa: 1 }}>
        <Outlet />
      </SomeContext>
    </div>
  );
};
export type SubRoute = RouteObject & {
  name: string;
};
export const getMenus = (prefix: string, subRoutes: SubRoute[]) =>
  subRoutes.map((item) => {
    const basename = `/${prefix}`;
    const finalPath = item.path ? `${basename}/${item.path}` : basename;
    return {
      label: <Link to={finalPath}>{item.name}</Link>,
      key: finalPath,
    };
  });
export default Layout;
export { SomeContext };
