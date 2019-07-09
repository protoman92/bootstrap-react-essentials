import querystring from "querystring";

/** Change a host, such as example.com, to api.example.com. */
export function apiHost(host: string): string {
  let apiHost = host;
  let startsWithWWW = false;

  if (apiHost.startsWith("www.")) {
    apiHost = apiHost.slice(4);
    startsWithWWW = true;
  }

  return `${startsWithWWW ? "www." : ""}api.${apiHost}`;
}

/**
 * Merge query maps into one big query map, concatenating values at common
 * keys together into an Array.
 */
export function mergeQueryMaps(...queries: readonly URLQueryMap[]) {
  return querystring.parse(
    queries.map(query => querystring.stringify(query)).join("&")
  );
}

export function toArray<T>(value: T | readonly T[]): readonly T[] {
  return value instanceof Array ? value : [value];
}
