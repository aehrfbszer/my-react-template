import { Outlet } from "react-router";
import { createContext } from "react";
import "./Layout.css";

// Context最好是单文件导出，不要和组件一起导出
const SomeContext = createContext<{ aa?: number }>({});

const Layout = () => {
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
