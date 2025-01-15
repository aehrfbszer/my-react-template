import RequireAuth from "./RequireAuth.tsx";
import Layout from "./Layout.tsx";

const LayoutWithAuth = () => {
	return (
		<RequireAuth>
			<Layout />
		</RequireAuth>
	);
};

export default LayoutWithAuth;
