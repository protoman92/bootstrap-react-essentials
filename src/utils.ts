import querystring from "querystring";

/** This should take care of both hash and normal URLs. */
export function getURLQuery({
  hash,
  search
}: Pick<
  Location | import("history").Location,
  "hash" | "search"
>): URLQueryArrayMap {
  let query: ReturnType<typeof querystring["parse"]>;

  if (!!search) {
    query = querystring.parse(search.substr(1));
  } else {
    const [, queryComponent = ""] = hash.match(/\?(.*)/i) || [];
    query = querystring.parse(queryComponent);
  }

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
  location: Pick<Location | import("history").Location, "hash" | "search">,
  urlQuery: URLQueryMap
) {
  const existingURLQuery = { ...getURLQuery(location) };

  Object.entries(urlQuery).forEach(([key, value]) => {
    if (value !== undefined) {
      existingURLQuery[key] = toArray(value);
    }
  });

  replaceURLQuery(historyWithCallbacks, existingURLQuery);
}
