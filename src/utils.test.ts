import querystring from "querystring";
import { deepEqual, instance, spy, verify } from "ts-mockito";
import { getURLQuery, mergeQueryMaps, toArray, updateURLQuery } from "./utils";

describe("Utilities", () => {
  it("Should get URL query correctly", async () => {
    // Setup
    const query = { a: "1", b: "2" };
    const location: Window["location"] = {} as any;
    location.search = `?${querystring.stringify(query)}`;

    // When
    const result = await getURLQuery({ location });

    // Then
    expect(result).toEqual(query);
  });

  it("Merge query maps should work", async () => {
    // Setup && When
    const merged1 = mergeQueryMaps(
      { a: ["1", "2", "3"], b: "1", c: "1" },
      { a: ["1", "2", "3"], b: ["2", "3"], c: "1" }
    );

    // Then
    expect(merged1).toEqual({
      a: ["1", "2", "3", "1", "2", "3"],
      b: ["1", "2", "3"],
      c: ["1", "1"]
    });
  });

  it("To array should work", async () => {
    expect(toArray(1)).toEqual([1]);
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("Update URL query should work", async () => {
    // Setup
    const history = spy<Window["history"]>({ replaceState: () => {} } as any);
    const window = { history: instance(history) };

    // When
    updateURLQuery(window, { a: "1", b: ["2", "3"] });
    updateURLQuery(window, { a: Array(0), b: Array(0), c: "10" });
    updateURLQuery(window, {});

    // Then
    verify(history.replaceState(deepEqual({}), "?a=1&b=2&b=3"));
    verify(history.replaceState(deepEqual({}), "?c=10"));
    verify(history.replaceState(deepEqual({}), ""));
  });
});
