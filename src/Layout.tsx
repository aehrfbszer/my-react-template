import { Outlet } from "react-router";
import { createContext, useState } from "react";
import "./Layout.css";
import { simpleStore } from "./store/simpleStore";

const SomeContext = createContext<{ aa?: number }>({});

const Layout = () => {
  simpleStore.register(useState);
  return (
    <div className="layout-container">
      <SomeContext value={{ aa: 1 }}>
        <Outlet />
      </SomeContext>
    </div>
  );
};

export default Layout;
export { SomeContext };
