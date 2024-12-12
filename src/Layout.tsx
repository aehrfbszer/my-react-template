import { Outlet } from "react-router";
import "./Layout.css";
const Layout = () => {
  return (
    <div className="layout-container">
      <Outlet />
    </div>
  );
};

export default Layout;
