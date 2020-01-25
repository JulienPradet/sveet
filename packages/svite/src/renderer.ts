export type Manifest = object;
export type Renderer = (props: object) => Promise<string>;

type RendererOptions = {
  template: string;
  rendererPath: string;
  manifestPath: string;
};

export default (options: RendererOptions): Renderer => {
  delete require.cache[require.resolve(options.manifestPath)];
  const manifest = require(options.manifestPath);

  delete require.cache[require.resolve(options.rendererPath)];
  const renderer = require(options.rendererPath);

  return props => {
    return renderer(props, manifest).then(
      (svelteResult: { html: string; head: string; css: { code: string } }) => {
        return options.template
          .replace("%svite.htmlAttributes%", `lang="en"`)
          .replace("%svite.head%", svelteResult.head)
          .replace("%svite.styles%", svelteResult.css.code)
          .replace("%svite.content%", svelteResult.html)
          .replace(
            "%svite.scripts%",
            `<script type="module" src="/static/index.js"></script>`
          );
      }
    );
  };
};
