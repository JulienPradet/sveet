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

const transformTemplate = ({ scripts }: TransformTemplateOptions) => (
  template: string
): string => {
  return template.replace("%svite.scripts%", scripts);
};

export const build = (
  options: TemplateOptions,
  transformOptions: TransformTemplateOptions
): Promise<string> => {
  return readFile(options.templatePath)
    .then(buffer => buffer.toString())
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
    (templateBuffer: Buffer, options) =>
      transformTemplate(options)(templateBuffer.toString())
  ).pipe(mergeMap(template => from(writeFile(options.output, template))));
};
