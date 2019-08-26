import querystring from "querystring";

export function getURLQuery({
  location: { search }
}: Pick<Window, "location">): URLQueryMap {
  return querystring.parse(search.slice(1));
}

export function toArray<T>(value: T | readonly T[]): readonly T[] {
  return value instanceof Array ? value : [value];
}

export function replaceURLQuery(
  { historyWithCallbacks }: Pick<Window, "historyWithCallbacks">,
  query: URLQueryMap
) {
  const newQueryMap = Object.entries(query)
    .filter(([, value]) => !!value && !!toArray(value).length)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const merged = querystring.stringify(newQueryMap);
  historyWithCallbacks.replaceState({}, "", !!merged ? `?${merged}` : "");
}

export function appendURLQuery(
  {
    historyWithCallbacks,
    location
  }: Pick<Window, "historyWithCallbacks" | "location">,
  urlQuery: URLQueryMap
) {
  const existingURLQuery = { ...getURLQuery({ location }) };

  Object.entries(urlQuery).forEach(([key, value]) => {
    existingURLQuery[key] = value;
  });

  replaceURLQuery({ historyWithCallbacks }, existingURLQuery);
}
