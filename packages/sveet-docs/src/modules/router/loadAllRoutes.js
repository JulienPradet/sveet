import routes from "../../../.sveet/routes";

export const loadAllRoutes = () => {
  return Promise.all(
    routes.map(({ component }) => {
      return component();
    })
  );
};
