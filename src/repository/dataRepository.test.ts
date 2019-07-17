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
  let client: RelativeHTTPClient;
  let urlDataSync: Repository.URLDataSync;

  beforeEach(() => {
    try {
      client = spy<RelativeHTTPClient>({
        get: () => Promise.reject(""),
        post: () => Promise.reject(""),
        patch: () => Promise.reject(""),
        delete: () => Promise.reject(""),
        head: () => Promise.reject("")
      });

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

      urlDataSync = createURLDataSyncRepository(
        { history: instance(history), location },
        instance(client)
      );
    } catch (e) {
      console.log(e);
    }
  });

  it("Should get data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.get(pathname, anything())).thenResolve(data);

    // When
    const result = await urlDataSync.get();

    // Then
    verify(client.get(pathname, deepEqual({ params }))).once();
    expect(result).toEqual(data);
  });

  it("Should update data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.patch(pathname, anything(), anything())).thenResolve(data);

    // When
    const result = await urlDataSync.update(data);

    // Then
    verify(
      client.patch(pathname, deepEqual(data), deepEqual({ params }))
    ).once();

    expect(result).toEqual(data);
  });

  it("Should update URL query correctly", async () => {
    // Setup && When
    await urlDataSync.updateURLQuery({ a: "1", b: ["2", "3"] });
    await urlDataSync.updateURLQuery({ a: Array(0), b: Array(0), c: "10" });
    await urlDataSync.updateURLQuery({});

    // Then
    verify(history.replaceState(deepEqual({}), "?a=1&b=2&b=3"));
    verify(history.replaceState(deepEqual({}), "?c=10"));
    verify(history.replaceState(deepEqual({}), ""));
  });

  it("Should get URL query correctly", async () => {
    // Setup
    const query = { a: "1", b: "2" };
    location.search = `?${querystring.stringify(query)}`;

    // When
    const result = await urlDataSync.getURLQuery();

    // Then
    expect(result).toEqual(query);
  });

  it("Should add on additional query correctly", async () => {
    // Setup
    when(client.get(anything(), anything())).thenResolve({});
    const query = { a: "1", b: "2" };

    // When
    await urlDataSync.get(query);

    // Then
    verify(client.get(anything(), deepEqual({ params: query }))).once();
  });
});
