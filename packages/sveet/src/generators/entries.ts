import { stripIndent } from "common-tags";
import { writeFile } from "../utils/fs";
import { Observable, from, combineLatest } from "rxjs";

type EntryOptions = {
  clientOutput: string;
  ssrOutput: string;
};

const makeClientEntry = () => {
  return stripIndent`
    ${
      process.env.NODE_ENV === "development"
        ? `import "sveet/dist/DevClient"`
        : ""
    }
    import renderClient from "sveet/renderClient";
    import routes from "./routes";

    export default renderClient(routes);
  `;
};

const makeSsrEntry = () => {
  return stripIndent`
    import renderSsr from "sveet/renderSsr";
    import routes from "./routes";

    export default renderSsr(routes);
  `;
};

type EntryOuput = { client: string; ssr: string };

export const build = (options: EntryOptions): Observable<EntryOuput> => {
  const client$ = from(writeFile(options.clientOutput, makeClientEntry()));
  const ssr$ = from(writeFile(options.ssrOutput, makeSsrEntry()));
  return combineLatest(client$, ssr$, (client, ssr) => ({ client, ssr }));
};

export const watch = (options: EntryOptions): Observable<EntryOuput> => {
  return build(options);
};
