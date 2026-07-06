import { Outlet, useLocation } from "react-router";
import { createContext, type ReactNode } from "react";
import "./Layout.css";

// Context最好是单文件导出，不要和组件一起导出
const SomeContext = createContext<{ aa?: number }>({});

interface LayoutProps {
  menus?: {
    label: ReactNode;
    key: string;
  }[];
}

const Layout = ({ menus }: LayoutProps) => {
  const location = useLocation();
  console.log("Layout rendered with menus:", menus, location.pathname);

  return (
    <div className="layout-container">
      {menus ? (
        <nav className="p-4">
          <ul className="flex items-center gap-4">
            {menus.map((me) => (
              <li key={me.key} className={location.pathname === me.key ? "text-blue-500" : ""}>
                {me.label}
              </li>
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

export default Layout;
export { SomeContext };
