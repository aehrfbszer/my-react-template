import type { ReactNode } from "react";
import { Link, type RouteObject } from "react-router";

export type SubRoute = RouteObject & {
  label: ReactNode;
};

export const getMenus = (prefix: string, subRoutes: SubRoute[]) =>
  subRoutes.map((item) => {
    const basename = `/${prefix}`;
    const finalPath = item.path ? `${basename}/${item.path}` : basename;
    return {
      label: <Link to={finalPath}>{item.label}</Link>,
      key: finalPath,
    };
  });
