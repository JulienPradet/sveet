import { from, Observable, of } from "rxjs";
import { writeFile } from "../utils/fs";
import { map, mergeMap } from "rxjs/operators";
import { join } from "path";

type RoutesOptions = {
  output: string;
};

type Route = {
  path: string;
  params: object;
  filepath: string;
};

export const build = () => {};

export const watch = (options: RoutesOptions): Observable<Array<Route>> => {
  return of([
    {
      path: "/",
      params: {},
      filepath: join(process.cwd(), "src/routes/index.svelte")
    },
    {
      path: "/",
      params: {
        slug: "string"
      },
      filepath: join(process.cwd(), "src/routes/[slug].svelte")
    }
  ] as Array<Route>).pipe(
    mergeMap(routes => {
      const routeTree = `
        [
          ${routes
            .map(
              route => `
              {
                path: "/",
                component: () => import("${route.filepath}").then((module) => {
                  return module.default
                })
              }
            `
            )
            .join(",\n")}
        ]
      `;

      return from(
        writeFile(
          options.output,
          `
            export default ${routeTree};
          `
        )
      ).pipe(map(() => routes));
    })
  );
};
