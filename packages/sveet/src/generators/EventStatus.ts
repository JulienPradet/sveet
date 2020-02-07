export type ErrorEvent = {
  type: "ErrorEvent";
  error: Error;
};

export type InitializeEvent = {
  type: "InitializeEvent";
};

export type ReadyEvent = {
  type: "ReadyEvent";
};

export type CompileEvent = {
  type: "CompileEvent";
};

export type ReloadEvent = {
  type: "ReloadEvent";
};

export type EventStatus =
  | ErrorEvent
  | InitializeEvent
  | ReadyEvent
  | CompileEvent
  | ReloadEvent;
