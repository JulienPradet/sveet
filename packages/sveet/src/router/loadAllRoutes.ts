import { Route } from "./routerTypes";

export const loadAllRoutes = (routes: Route[]) => {
  return Promise.all(
    routes.map(({ component }) => {
      return component();
    })
  );
};
