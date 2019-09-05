import querystring from "querystring";

export function getURLQuery({
  search
}: Pick<Location | import("history").Location, "search">): URLQueryArrayMap {
  const query = querystring.parse(search.slice(1));
  return Object.entries(query).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: toArray(value) }),
    {}
  );
}

export function toArray<T>(value: T | readonly T[]): readonly T[] {
  return value instanceof Array ? value : [value];
}

export function replaceURLQuery(
  historyWithCallbacks: Window["historyWithCallbacks"],
  query: URLQueryMap
) {
  const newQueryMap = Object.entries(query)
    .filter(([, value]) => !!value && !!toArray(value).length)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const merged = querystring.stringify(newQueryMap);
  historyWithCallbacks.replaceState({}, "", !!merged ? `?${merged}` : "");
}

export function appendURLQuery(
  historyWithCallbacks: Window["historyWithCallbacks"],
  location: Pick<Location | import("history").Location, "search">,
  urlQuery: URLQueryMap
) {
  const existingURLQuery = { ...getURLQuery(location) };

  Object.entries(urlQuery).forEach(([key, value]) => {
    existingURLQuery[key] = toArray(value);
  });

  replaceURLQuery(historyWithCallbacks, existingURLQuery);
}
