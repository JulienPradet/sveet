import { from, Observable, of } from "rxjs";
import { writeFile } from "../utils/fs";
import { map, mergeMap } from "rxjs/operators";
import { join, relative, extname } from "path";

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
  const getChunkName = (filepath: string) => {
    return relative(join(process.cwd(), "./src"), filepath);
  };

  return of([
    {
      path: "/",
      params: {},
      filepath: join(process.cwd(), "src/routes/index.svelte")
    },
    {
      path: "/:slug",
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
                path: ${JSON.stringify(route.path)},
                id: ${JSON.stringify(getChunkName(route.filepath))},
                component: () => import("${route.filepath}")
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
