export enum EventStatusEnum {
  initialize = "initialize",
  ready = "ready",
  compile = "compile",
  reload = "reload",
  error = "error",
  rendererUpdate = "rendererUpdate"
}

export type EventStatus = {
  action: EventStatusEnum;
  payload?: any;
};
