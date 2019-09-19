import H from "history";
import querystring from "querystring";

export function getURLComponents({
  pathname,
  search
}: Pick<H.Location, "pathname" | "search">): Readonly<{
  pathname: string;
  query: URLQueryArrayMap;
}> {
  let query: ReturnType<typeof querystring["parse"]>;
  query = querystring.parse(search.substr(1));

  query = Object.entries(query).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: toArray(value) }),
    {}
  );

  return { pathname, query: query as URLQueryArrayMap };
}

/** This should take care of both hash and normal URLs. */
export function getURLQuery(
  location: Pick<H.Location, "pathname" | "search">
): URLQueryArrayMap {
  return getURLComponents(location).query;
}

export function toArray<T>(value: T | readonly T[]): readonly T[] {
  return value instanceof Array ? value : [value];
}

export function replaceURLQuery(history: H.History, query: URLQueryMap) {
  const newQueryMap = Object.entries(query)
    .filter(([, value]) => !!value && !!toArray(value).length)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  let merged = querystring.stringify(newQueryMap);
  merged = !!merged ? `?${merged}` : "";
  history.replace(merged);
}

export function appendURLQuery(
  history: H.History,
  location: Pick<H.Location, "pathname" | "search">,
  urlQuery: URLQueryMap
) {
  const existingURLQuery = { ...getURLQuery(location) };

  Object.entries(urlQuery).forEach(([key, value]) => {
    if (value !== undefined) {
      existingURLQuery[key] = toArray(value);
    }
  });

  replaceURLQuery(history, existingURLQuery);
}
