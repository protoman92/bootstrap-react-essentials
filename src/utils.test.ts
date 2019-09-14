import { stringify } from "querystring";
import { deepEqual, instance, spy, verify } from "ts-mockito";
import { appendURLQuery, getURLQuery, replaceURLQuery, toArray } from "./utils";

describe("Utilities", () => {
  it("Should get URL query with search correctly", async () => {
    // Setup
    const query = { a: "1", b: "2" };
    const location = { hash: "", search: `?${stringify(query)}` };

    // When
    const result = await getURLQuery(location);

    // Then
    expect(result).toEqual({ a: ["1"], b: ["2"] });
  });

  it("Should get URL query with hash correctly", async () => {
    // Setup
    const query = { a: "1", b: "2" };
    const location = { hash: `#/test?${stringify(query)}`, search: "" };

    // When
    const result = await getURLQuery(location);

    // Then
    expect(result).toEqual({ a: ["1"], b: ["2"] });
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

    const historyInstance = instance(history);

    // When
    replaceURLQuery(historyInstance, { a: "1", b: ["2", "3"] });
    replaceURLQuery(historyInstance, { a: Array(0), b: Array(0), c: "10" });
    replaceURLQuery(historyInstance, {});

    // Then
    verify(history.replaceState(deepEqual({}), "?a=1&b=2&b=3"));
    verify(history.replaceState(deepEqual({}), "?c=10"));
    verify(history.replaceState(deepEqual({}), ""));
  });

  it("Append URL query with search should work", async () => {
    // Setup
    const history = spy<Window["historyWithCallbacks"]>({
      replaceState: () => {}
    } as any);

    // When && Then 1
    appendURLQuery(
      instance(history),
      { hash: "", search: "?a=0" },
      { a: "1", b: ["2", "3"] }
    );

    appendURLQuery(
      instance(history),
      { hash: "", search: "?a=0&b=1" },
      {
        a: Array(0),
        b: Array(0),
        c: "10"
      }
    );

    appendURLQuery(instance(history), { hash: "", search: "?a=0&b=1" }, {});

    // Then
    verify(history.replaceState(deepEqual({}), "?a=0&b=2&b=3"));
    verify(history.replaceState(deepEqual({}), "?c=10"));
    verify(history.replaceState(deepEqual({}), "?a=0&b=1"));
  });
});
