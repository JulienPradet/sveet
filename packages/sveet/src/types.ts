export enum PreloadType {
  fetch = "fetch",
  script = "script"
}
export type Preload = {
  href: string;
  as: PreloadType;
  crossorigin: boolean;
};
