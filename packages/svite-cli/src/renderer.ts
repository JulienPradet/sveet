export type Renderer = (props: object) => Promise<string>;

export default (path: string): Renderer => {
  delete require.cache[require.resolve(path)];
  return require(path);
};
