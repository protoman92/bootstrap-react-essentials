import querystring from "querystring";

export function getURLQuery({
  location: { search }
}: Pick<Window, "location">): URLQueryMap {
  return querystring.parse(search.slice(1));
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

export function replaceURLQuery(
  { history }: Pick<Window, "history">,
  query: URLQueryMap
) {
  const newQueryMap = Object.entries(query)
    .filter(([, value]) => !!value && !!toArray(value).length)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const merged = querystring.stringify(newQueryMap);
  history.replaceState({}, "", !!merged ? `?${merged}` : "");
}
