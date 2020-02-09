import { join, dirname } from "path";
export type Manifest = object;
export type Renderer = (props: object) => Promise<string>;

type RendererOptions = {
  template: string;
  rendererPath: string;
  clientPath: string;
  manifestPath: string;
  ssrManifestPath: string;
};

export default (options: RendererOptions): Renderer => {
  delete require.cache[require.resolve(options.ssrManifestPath)];
  const ssrManifest: string[] = require(options.ssrManifestPath);
  ssrManifest.forEach(path => {
    delete require.cache[join(dirname(options.rendererPath), path)];
  });

  delete require.cache[require.resolve(options.manifestPath)];
  const manifest = require(options.manifestPath);

  delete require.cache[require.resolve(options.rendererPath)];
  const renderer = require(options.rendererPath);

  return props => {
    return renderer(props, { manifest }).then(
      (svelteResult: { html: string; head: string; css: { code: string } }) => {
        return options.template
          .replace("%sveet.htmlAttributes%", `lang="en"`)
          .replace("%sveet.head%", svelteResult.head)
          .replace("%sveet.styles%", svelteResult.css.code)
          .replace("%sveet.content%", svelteResult.html)
          .replace(
            "%sveet.scripts%",
            `<script type="module" src="${options.clientPath}"></script>`
          );
      }
    );
  };
};
