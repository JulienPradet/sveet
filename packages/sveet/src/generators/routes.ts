import { from, Observable, of } from "rxjs";
import { writeFile } from "../utils/fs";
import { map, mergeMap } from "rxjs/operators";
import { join, relative } from "path";

type RoutesOptions = {
  output: string;
};

type Route = {
  path: RegExp;
  filepath: string;
};

const getRoutesFiles = () => {
  const routes = [
    {
      path: /^\/$/,
      filepath: join(process.cwd(), "src/routes/index.svelte")
    },
    {
      path: new RegExp("^/(?<slug>[^?#]*)"),
      filepath: join(process.cwd(), "src/routes/[slug].svelte")
    }
  ] as Array<Route>;

  return routes;
};

const renderRoutesFile = (routes: Array<Route>): string => {
  const getChunkName = (filepath: string) => {
    return relative(join(process.cwd(), "./src"), filepath);
  };

  return `
    export default [
      ${routes
        .map(
          route => `
            {
              path: ${route.path.toString()},
              id: ${JSON.stringify(getChunkName(route.filepath))},
              component: () => import("${route.filepath}")
            }
          `
        )
        .join(",\n")}
    ]
  `;
};

export const build = (options: RoutesOptions): Observable<Array<Route>> => {
  const routes = getRoutesFiles();
  return from(writeFile(options.output, renderRoutesFile(routes))).pipe(
    map(() => routes)
  );
};

export const watch = (options: RoutesOptions): Observable<Array<Route>> => {
  return of(getRoutesFiles()).pipe(
    mergeMap(routes => {
      return from(writeFile(options.output, renderRoutesFile(routes))).pipe(
        map(() => routes)
      );
    })
  );
};
