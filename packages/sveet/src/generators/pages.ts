import { Renderer } from "../renderer";
import { SsrStaticClient } from "../graphql/SsrStaticClient";
import { Observable, from, merge } from "rxjs";
import { mergeMap, finalize, last, tap } from "rxjs/operators";
import { join } from "path";
import { writeFile } from "../utils/fs";
import QueryManager from "../graphql/QueryManager";
import GraphQLClient from "../graphql/GraphQLClient";

type Location = {
  pathname: string;
  search: string;
  state: null;
};

export const build = ({
  renderer,
  queryManager,
  client
}: {
  renderer: Renderer;
  queryManager: QueryManager;
  client: GraphQLClient;
}) => {
  const ssrStaticClient = new SsrStaticClient(queryManager, client);

  const getPages = (): Observable<Location> => {
    return from([
      {
        pathname: "/",
        search: "",
        state: null
      },
      { pathname: "/ZmlsbXM6Mw==", search: "", state: null },
      { pathname: "/ZmlsbXM6NA==", search: "", state: null },
      { pathname: "/ZmlsbXM6NQ==", search: "", state: null }
    ]);
  };

  const renderPage = (location: Location) => {
    return renderer({
      initialPage: location,
      staticClient: ssrStaticClient
    });
  };

  const sveetData$ = ssrStaticClient.getFetchedRequests$().pipe(
    mergeMap(request => {
      return from(
        writeFile(
          join(
            process.cwd(),
            "build/__sveet/data/",
            request.query,
            `${JSON.stringify(request.variables)}.json`
          ),
          JSON.stringify(request.result)
        )
      );
    }),
    tap(
      path => {
        console.log(path);
      },
      () => {},
      () => console.log("Data completed")
    )
  );

  const htmlPages$ = getPages().pipe(
    mergeMap(location => {
      return from(
        renderPage(location).then(html => {
          return writeFile(
            join(process.cwd(), "build/", location.pathname, "index.html"),
            html
          );
        })
      );
    }),
    tap(
      path => {
        console.log(path);
      },
      () => {},
      () => console.log("Pages completed")
    ),
    tap(
      () => {},
      () => {},
      () => {
        return ssrStaticClient.closeClient();
      }
    )
  );

  return merge(htmlPages$, sveetData$).pipe(last());
};
