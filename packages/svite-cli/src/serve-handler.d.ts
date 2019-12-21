declare module "serve-handler" {
  import { IncomingMessage, ServerResponse } from "http";

  export interface IHeader {
    key: string;
    value: string;
  }

  export interface IRedirect {
    source: string;
    destination: string;
  }

  export interface IServeHandlerOptions {
    public?: string;
    cleanUrls?: boolean | string[];
    rewrites?: IRedirect[];
    redirects?: IRedirect[];
    headers?: IHeader[];
    directoryListing?: boolean | string[];
    unlisted?: string[];
    trailingSlash?: boolean;
    renderSingle?: boolean;
    symlinks?: boolean;
  }

  export default function(
    request: IncomingMessage,
    response: ServerResponse,
    options?: IServeHandlerOptions
  ): void;
}
