export const loadAllRoutes = routes => {
  return Promise.all(
    routes.map(({ component }) => {
      return component();
    })
  );
};
