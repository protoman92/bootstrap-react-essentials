import querystring from "querystring";
import { deepEqual, instance, spy, verify } from "ts-mockito";
import { appendURLQuery, getURLQuery, replaceURLQuery, toArray } from "./utils";

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

  it("To array should work", async () => {
    expect(toArray(1)).toEqual([1]);
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("Replace URL query should work", async () => {
    // Setup
    const history = spy<Window["historyWithCallbacks"]>({
      replaceState: () => {}
    } as any);

    const window = { historyWithCallbacks: instance(history) };

    // When
    replaceURLQuery(window, { a: "1", b: ["2", "3"] });
    replaceURLQuery(window, { a: Array(0), b: Array(0), c: "10" });
    replaceURLQuery(window, {});

    // Then
    verify(history.replaceState(deepEqual({}), "?a=1&b=2&b=3"));
    verify(history.replaceState(deepEqual({}), "?c=10"));
    verify(history.replaceState(deepEqual({}), ""));
  });

  it("Append URL query should work", async () => {
    // Setup
    const history = spy<Window["historyWithCallbacks"]>({
      replaceState: () => {}
    } as any);

    // When && Then 1
    appendURLQuery(
      {
        historyWithCallbacks: instance(history),
        location: { search: "?a=0" } as any
      },
      { a: "1", b: ["2", "3"] }
    );

    appendURLQuery(
      {
        historyWithCallbacks: instance(history),
        location: { search: "?a=0&b=1" } as any
      },
      { a: Array(0), b: Array(0), c: "10" }
    );

    appendURLQuery(
      {
        historyWithCallbacks: instance(history),
        location: { search: "?a=0&b=1" } as any
      },
      {}
    );

    // Then
    verify(history.replaceState(deepEqual({}), "?a=0&b=2&b=3"));
    verify(history.replaceState(deepEqual({}), "?c=10"));
    verify(history.replaceState(deepEqual({}), "?a=0&b=1"));
  });
});
