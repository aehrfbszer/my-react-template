import { Navigate } from "react-router";
import { useLocalStorage } from "../utils/useLocalStorage.ts";
import type React from "react";

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [token] = useLocalStorage("token");

	console.log("token 页面", token);

	// 判断是否已登录
	if (token) {
		console.log(token, "有token");
		console.log(">>>>>>>>>>>>>>>>>>> destination (目的地)");
		return children;
	}
	console.log(">>>>>>>>>>>>>>>>>>> login (登录页)");
	return <Navigate to="/login" replace />;
};

export default RequireAuth;
