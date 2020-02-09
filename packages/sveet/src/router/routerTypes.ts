type SvelteComponent = {
  preload: (options: { location: CurrentLocation }) => void;
};

export type Route = {
  path: RegExp;
  id: string;
  component: () => Promise<SvelteComponent>;
  resolvedComponent?: SvelteComponent;
};

export type Location = {
  pathname: string;
  search: string;
  state: null;
};

export type CurrentLocation = {
  pathname: string;
  search: string;
  state: null;
  params: { [key: string]: string };
};
