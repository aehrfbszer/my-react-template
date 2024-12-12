import { Outlet } from "react-router";

const Layout = () => {
  return (
    <div className="layout-container">
      <Outlet />
    </div>
  );
};

export default Layout;
