import { stringify } from "querystring";
import { deepEqual, instance, spy, verify } from "ts-mockito";
import { constructObject } from "./testUtils";
import {
  appendURLQuery,
  getURLComponents,
  replaceURLQuery,
  toArray
} from "./utils";

describe("Utilities", () => {
  it("Should get URL components with search correctly", async () => {
    // Setup
    const query = { a: "1", b: "2" };

    const location = {
      hash: "",
      pathname: "/path/name",
      search: `?${stringify(query)}`
    };

    // When
    const {
      pathname: resultPathName,
      query: resultQuery
    } = await getURLComponents(location);

    // Then
    expect(resultPathName).toEqual("/path/name");
    expect(resultQuery).toEqual({ a: ["1"], b: ["2"] });
  });

  it("Should get URL components with hash correctly", async () => {
    // Setup && When && Then: with query
    const {
      pathname: resultPathName1,
      query: resultQuery1
    } = await getURLComponents({
      hash: `#/path/name?${stringify({ a: "1", b: "2" })}`,
      pathname: "",
      search: ""
    });

    expect(resultPathName1).toEqual("/path/name");
    expect(resultQuery1).toEqual({ a: ["1"], b: ["2"] });

    // Setup && When && Then: without query
    const {
      pathname: resultPathName2,
      query: resultQuery2
    } = await getURLComponents({
      hash: `#/path/name`,
      pathname: "",
      search: ""
    });

    expect(resultPathName2).toEqual("/path/name");
    expect(resultQuery2).toEqual({});
  });

  it("To array should work", async () => {
    expect(toArray(1)).toEqual([1]);
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("Replace URL query with search should work", async () => {
    // Setup
    const history = spy<Window["historyWithCallbacks"]>(
      constructObject<Window["historyWithCallbacks"]>({
        replaceState: () => {}
      })
    );

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
    const history = spy<Window["historyWithCallbacks"]>(
      constructObject<Window["historyWithCallbacks"]>({
        replaceState: () => {}
      })
    );

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
    const history = spy<Window["historyWithCallbacks"]>(
      constructObject<Window["historyWithCallbacks"]>({
        replaceState: () => {}
      })
    );

    // When
    appendURLQuery(
      instance(history),
      { hash: "", pathname: "", search: "?a=0" },
      { a: "1", b: ["2", "3"] }
    );

    appendURLQuery(
      instance(history),
      { hash: "", pathname: "", search: "?a=0&b=1" },
      {
        a: Array(0),
        b: Array(0),
        c: "10"
      }
    );

    appendURLQuery(
      instance(history),
      { hash: "", pathname: "", search: "?a=0&b=1" },
      {}
    );

    // Then
    verify(history.replaceState(deepEqual({}), "", "?a=1&b=2&b=3")).once();
    verify(history.replaceState(deepEqual({}), "", "?c=10")).once();
    verify(history.replaceState(deepEqual({}), "", "?a=0&b=1")).once();
  });
});
