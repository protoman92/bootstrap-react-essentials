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

  it("Replace URL query with search should work", async () => {
    // Setup
    const history = spy<Window["historyWithCallbacks"]>({
      replaceState: () => {}
    } as any);

    const historyInstance = instance(history);
    const location = { hash: "" };

    // When
    replaceURLQuery(historyInstance, location, { a: "1", b: ["2", "3"] });

    replaceURLQuery(historyInstance, location, {
      a: Array(0),
      b: Array(0),
      c: "10"
    });

    replaceURLQuery(historyInstance, location, {});

    // Then
    verify(history.replaceState(deepEqual({}), "", "?a=1&b=2&b=3")).once();
    verify(history.replaceState(deepEqual({}), "", "?c=10")).once();
    verify(history.replaceState(deepEqual({}), "", "")).once();
  });

  it("Replace URL query with hash should work", async () => {
    // Setup
    const history = spy<Window["historyWithCallbacks"]>({
      replaceState: () => {}
    } as any);

    const historyInstance = instance(history);
    const location = { hash: "#/test?a=1" };

    // When
    replaceURLQuery(historyInstance, location, { a: "1", b: ["2", "3"] });

    replaceURLQuery(historyInstance, location, {
      a: Array(0),
      b: Array(0),
      c: "10"
    });

    replaceURLQuery(historyInstance, location, {});
    replaceURLQuery(historyInstance, { hash: "#/test" }, { a: ["1", "2"] });

    // Then
    verify(
      history.replaceState(deepEqual({}), "", "#/test?a=1&b=2&b=3")
    ).once();

    verify(history.replaceState(deepEqual({}), "", "#/test?c=10")).once();
    verify(history.replaceState(deepEqual({}), "", "#/test")).once();
    verify(history.replaceState(deepEqual({}), "", "#/test?a=1&a=2")).once();
  });

  it("Append URL query with search should work", async () => {
    // Setup
    const history = spy<Window["historyWithCallbacks"]>({
      replaceState: () => {}
    } as any);

    // When
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
    verify(history.replaceState(deepEqual({}), "", "?a=1&b=2&b=3")).once();
    verify(history.replaceState(deepEqual({}), "", "?c=10")).once();
    verify(history.replaceState(deepEqual({}), "", "?a=0&b=1")).once();
  });
});
