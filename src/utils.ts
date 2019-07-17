import querystring from "querystring";

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
