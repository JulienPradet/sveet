export type Renderer = (props: object) => Promise<string>;

type RendererOptions = {
  template: string;
  rendererPath: string;
};

export default (options: RendererOptions): Renderer => {
  delete require.cache[require.resolve(options.rendererPath)];
  const renderer = require(options.rendererPath);
  return props => {
    return renderer(props).then(
      (svelteResult: { html: string; head: string; css: string }) => {
        return options.template
          .replace("%svite.htmlAttributes%", `lang="en"`)
          .replace("%svite.head%", svelteResult.head)
          .replace("%svite.content%", svelteResult.html)
          .replace(
            "%svite.scripts%",
            `<script type="module" src="/static/index.js"></script>`
          );
      }
    );
  };
};
