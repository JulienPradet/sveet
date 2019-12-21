import { stripIndent } from "common-tags";
import { writeFile } from "../utils/fs";
import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

type GenerateEntryOptions = {
  entry: string;
};
type EntryOptions = {
  output: string;
};

const makeEntry = ({ entry }: GenerateEntryOptions) => {
  return stripIndent`
    import "svite-cli/dist/DevClient";
    import "${entry}";
  `;
};

export const build = (
  options: EntryOptions,
  entryOptions: GenerateEntryOptions
) => {
  return writeFile(options.output, makeEntry(entryOptions));
};

export const watch = (
  options: EntryOptions,
  entryOptions$: Observable<GenerateEntryOptions>
): Observable<string> => {
  return entryOptions$.pipe(
    mergeMap(entryOptions => writeFile(options.output, makeEntry(entryOptions)))
  );
};
