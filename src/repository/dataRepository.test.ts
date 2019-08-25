import querystring from "querystring";
import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { createURLDataSyncRepository } from "./dataRepository";

describe("URL sync repository", () => {
  const pathname = "/users/1";
  const params = { a: "1", b: "2" };
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
      replaceState: () => {},
      onStateChange: () => {
        throw new Error("Unsupported");
      }
    });

    urlDataSync = createURLDataSyncRepository(
      { history: instance(history), location },
      instance(client)
    );
  });

  it("Should get data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.fetch(pathname, anything())).thenResolve(data);

    // When
    const result = await urlDataSync.get();

    // Then
    verify(client.fetch(pathname, deepEqual({ method: "get", params }))).once();
    expect(result).toEqual(data);
  });

  it("Should update data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.fetch(pathname, anything())).thenResolve(data);

    // When
    const result = await urlDataSync.update(data);

    // Then
    verify(
      client.fetch(pathname, deepEqual({ data, method: "patch", params }))
    ).once();

    expect(result).toEqual(data);
  });

  it("Should add on additional query correctly", async () => {
    // Setup
    when(client.fetch(anything(), anything())).thenResolve({});
    const query = { a: "1", b: "2" };

    // When
    await urlDataSync.get(query);

    // Then
    verify(
      client.fetch(anything(), deepEqual({ method: "get", params: query }))
    ).once();
  });
});
