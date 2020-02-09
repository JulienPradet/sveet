import { Renderer } from "../renderer";
import { SsrStaticClient } from "../query/SsrStaticClient";
import { Observable, from, merge } from "rxjs";
import { last, tap, mergeMap } from "rxjs/operators";
import { join } from "path";
import { writeFile } from "../utils/fs";

type Location = {
  pathname: string;
  search: string;
  state: null;
};

export const build = ({
  renderer,
  ssrStaticClient
}: {
  renderer: Renderer;
  ssrStaticClient: SsrStaticClient;
}) => {
  const getPages = (): Observable<Location> => {
    return from([
      {
        pathname: "/",
        search: "",
        state: null
      },
      { pathname: "/1", search: "", state: null },
      { pathname: "/2", search: "", state: null },
      { pathname: "/3", search: "", state: null },
      { pathname: "/4", search: "", state: null },
      { pathname: "/5", search: "", state: null },
      { pathname: "/6", search: "", state: null },
      { pathname: "/7", search: "", state: null }
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
            request.hash,
            `${JSON.stringify(request.props)}.json`
          ),
          JSON.stringify(request.result)
        )
      );
    }),
    tap(
      path => {},
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
      path => {},
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
