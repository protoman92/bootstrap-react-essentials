import querystring from "querystring";
import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { createURLDataSyncRepository } from "./dataRepository";
import { constructObject } from "../testUtils";

describe("URL sync repository", () => {
  const headers = {};
  const pathname = "/users/1";
  const params = { a: ["1"], b: ["2"] };
  const search = `?${querystring.stringify(params)}`;

  const location: Location = {
    pathname,
    search,
    hash: "",
    ancestorOrigins: [] as any,
    host: "",
    hostname: "",
    href: "",
    origin: "",
    port: "",
    protocol: "",
    assign: () => {},
    reload: () => {},
    replace: () => {}
  };

  let history: History;
  let historyWithCallbacks: HistoryWithCallbacks;
  let client: HTTPClient;
  let urlDataSync: Repository.URLDataSync;

  beforeEach(() => {
    client = spy<HTTPClient>({ fetch: () => Promise.reject("") });

    history = spy<History>({
      length: 0,
      scrollRestoration: "auto",
      state: {},
      back: () => {},
      forward: () => {},
      go: () => {},
      pushState: () => {},
      replaceState: () => {}
    });

    historyWithCallbacks = spy<HistoryWithCallbacks>(
      constructObject<HistoryWithCallbacks>({
        onStateChange: () => ({ unsubscribe: () => {} }),
        pushState: () => {},
        replaceState: () => {}
      })
    );

    urlDataSync = createURLDataSyncRepository(
      {
        history: instance(history),
        historyWithCallbacks: instance(historyWithCallbacks),
        location
      },
      instance(client)
    );
  });

  it("Should get data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.fetch(anything())).thenResolve(data);

    // When
    const result = await urlDataSync.get();

    // Then
    verify(client.fetch(deepEqual({ headers, method: "get", params }))).once();
    expect(result).toEqual(data);
  });

  it("Should update data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.fetch(anything())).thenResolve(data);

    // When
    const result = await urlDataSync.update(data);

    // Then
    verify(
      client.fetch(deepEqual({ data, headers, method: "patch", params }))
    ).once();

    expect(result).toEqual(data);
  });

  it("Should add on additional query correctly", async () => {
    // Setup
    when(client.fetch(anything())).thenResolve({});
    const newParams = { a: ["2"], b: ["3"], c: ["4"] };

    // When
    await urlDataSync.get({ params: newParams });

    // Then
    verify(
      client.fetch(deepEqual({ headers, method: "get", params: newParams }))
    ).once();
  });
});
