import H from "history";
import { stringify } from "querystring";
import { instance, spy, verify } from "ts-mockito";
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

  it("To array should work", async () => {
    expect(toArray(1)).toEqual([1]);
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("Replace URL query with search should work", async () => {
    // Setup
    const history = spy<H.History>(
      constructObject<H.History>({
        replace: () => {}
      })
    );

    const historyInstance = instance(history);

    // When
    replaceURLQuery(historyInstance, { a: "1", b: ["2", "3"] });

    replaceURLQuery(historyInstance, {
      a: Array(0),
      b: Array(0),
      c: "10"
    });

    replaceURLQuery(historyInstance, {});

    // Then
    verify(history.replace("?a=1&b=2&b=3")).once();
    verify(history.replace("?c=10")).once();
    verify(history.replace("")).once();
  });

  it("Append URL query with search should work", async () => {
    // Setup
    const history = spy<H.History>(
      constructObject<H.History>({ replace: () => {} })
    );

    // When
    appendURLQuery(
      instance(history),
      { pathname: "", search: "?a=0" },
      { a: "1", b: ["2", "3"] }
    );

    appendURLQuery(
      instance(history),
      { pathname: "", search: "?a=0&b=1" },
      {
        a: Array(0),
        b: Array(0),
        c: "10"
      }
    );

    appendURLQuery(instance(history), { pathname: "", search: "?a=0&b=1" }, {});

    // Then
    verify(history.replace("?a=1&b=2&b=3")).once();
    verify(history.replace("?c=10")).once();
    verify(history.replace("?a=0&b=1")).once();
  });
});
