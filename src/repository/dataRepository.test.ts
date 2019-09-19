import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { createURLDataSyncRepository } from "./dataRepository";

describe("URL sync repository", () => {
  const headers = {};
  let client: HTTPClient;
  let urlDataSync: Repository.URLDataSync;

  beforeEach(() => {
    client = spy<HTTPClient>({ fetch: () => Promise.reject("") });
    urlDataSync = createURLDataSyncRepository(instance(client));
  });

  it("Should get data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.fetch(anything())).thenResolve(data);

    // When
    const result = await urlDataSync.get({ pathname: "", search: "?a=1&b=2" });

    // Then
    verify(
      client.fetch(
        deepEqual({ headers, method: "get", params: { a: ["1"], b: ["2"] } })
      )
    ).once();

    expect(result).toEqual(data);
  });

  it("Should update data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.fetch(anything())).thenResolve(data);

    // When
    const result = await urlDataSync.update(
      { pathname: "", search: "?a=1&b=2" },
      data
    );

    // Then
    verify(
      client.fetch(
        deepEqual({
          data,
          headers,
          method: "patch",
          params: { a: ["1"], b: ["2"] }
        })
      )
    ).once();

    expect(result).toEqual(data);
  });

  it("Should add on additional query correctly", async () => {
    // Setup
    when(client.fetch(anything())).thenResolve({});
    const newParams = { a: ["2"], b: ["3"], c: ["4"] };

    // When
    await urlDataSync.get({ pathname: "", search: "" }, { params: newParams });

    // Then
    verify(
      client.fetch(deepEqual({ headers, method: "get", params: newParams }))
    ).once();
  });
});
