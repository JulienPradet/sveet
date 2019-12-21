import { readFile, readFile$, writeFile } from "../utils/fs";
import { Observable, from, combineLatest } from "rxjs";
import { mergeMap } from "rxjs/operators";

type TransformTemplateOptions = {
  scripts: string;
};

type TemplateOptions = {
  templatePath: string;
  output: string;
};

const transformTemplate = ({
  scripts
}: TransformTemplateOptions) => template => {
  return template.replace("%svite.scripts%", scripts);
};

export const build = (
  options: TemplateOptions,
  transformOptions: TransformTemplateOptions
) => {
  return readFile(options.templatePath)
    .then(transformTemplate(transformOptions))
    .then(template => writeFile(options.output, template));
};

export const watch = (
  options: TemplateOptions,
  transformOptions$: Observable<TransformTemplateOptions>
): Observable<string> => {
  const template$ = readFile$(options.templatePath);

  return combineLatest(
    template$,
    transformOptions$,
    (templateBuffer, options) =>
      transformTemplate(options)(templateBuffer.toString())
  ).pipe(mergeMap(template => from(writeFile(options.output, template))));
};
