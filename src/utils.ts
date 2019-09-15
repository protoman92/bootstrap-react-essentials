import querystring from "querystring";

export function getURLComponents({
  hash,
  pathname,
  search
}: Pick<Location, "hash" | "pathname" | "search">): Readonly<{
  pathname: string;
  query: URLQueryArrayMap;
}> {
  let query: ReturnType<typeof querystring["parse"]>;

  if (!!hash) {
    pathname = hash.substring(1);
    const { 1: hashQuery = "", index } = pathname.match(/\?(.*)/i) || [];
    query = querystring.parse(hashQuery);

    if (index !== undefined) {
      pathname = pathname.substring(0, index);
    }
  } else {
    query = querystring.parse(search.substr(1));
  }

  query = Object.entries(query).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: toArray(value) }),
    {}
  );

  return { pathname, query: query as URLQueryArrayMap };
}

/** This should take care of both hash and normal URLs. */
export function getURLQuery(
  location: Pick<Location, "hash" | "pathname" | "search">
): URLQueryArrayMap {
  return getURLComponents(location).query;
}

export function toArray<T>(value: T | readonly T[]): readonly T[] {
  return value instanceof Array ? value : [value];
}

export function replaceURLQuery(
  historyWithCallbacks: Window["historyWithCallbacks"],
  { hash }: Pick<Location | import("history").Location, "hash">,
  query: URLQueryMap
) {
  const newQueryMap = Object.entries(query)
    .filter(([, value]) => !!value && !!toArray(value).length)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  let merged = querystring.stringify(newQueryMap);
  merged = !!merged ? `?${merged}` : "";

  if (!!hash) {
    const { index } = hash.match(/\?(.*)/i) || [];

    if (index !== undefined) {
      hash = hash.substring(0, index);
    }

    merged = `${hash}${merged}`;
  }

  historyWithCallbacks.replaceState({}, "", merged);
}

export function appendURLQuery(
  historyWithCallbacks: Window["historyWithCallbacks"],
  location: Pick<Location, "hash" | "pathname" | "search">,
  urlQuery: URLQueryMap
) {
  const existingURLQuery = { ...getURLQuery(location) };

  Object.entries(urlQuery).forEach(([key, value]) => {
    if (value !== undefined) {
      existingURLQuery[key] = toArray(value);
    }
  });

  replaceURLQuery(historyWithCallbacks, location, existingURLQuery);
}
