import querystring from "querystring";

/** Make an Array that can be sparse, i.e. have unfilled space. */
export function createSparseArray<T>(
  length: number,
  ...initialData: readonly T[]
): readonly (T | undefined)[] {
  if (initialData.length >= length) return initialData;
  const sparseArray: T[] = [...Array(length)];
  initialData.forEach((datum, i) => (sparseArray[i] = datum));
  return sparseArray;
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
