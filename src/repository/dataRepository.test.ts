import querystring from "querystring";
import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { createURLDataSyncRepository } from "./dataRepository";

describe("URL sync repository", () => {
  const pathname = "/users/1";
  const params = { a: "1", b: "2" };
  const search = `?${querystring.stringify(params)}`;

  const location = {
    pathname,
    search,
    state: {},
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

  let client: RelativeHTTPClient;
  let urlSync: Repository.URLDataSync;

  beforeEach(() => {
    client = spy<RelativeHTTPClient>({
      get: () => Promise.reject(""),
      post: () => Promise.reject(""),
      patch: () => Promise.reject(""),
      delete: () => Promise.reject(""),
      head: () => Promise.reject("")
    });

    urlSync = createURLDataSyncRepository({ location }, instance(client));
  });

  it("Should get data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.get(pathname, anything())).thenResolve(data);

    // When
    const result = await urlSync.get();

    // Then
    verify(client.get(pathname, deepEqual({ params }))).once();
    expect(result).toEqual(data);
  });

  it("Should update data correctly", async () => {
    // Setup
    const data = { a: 0, b: 1, c: 2 };
    when(client.patch(pathname, anything(), anything())).thenResolve(data);

    // When
    const result = await urlSync.update(data);

    // Then
    verify(
      client.patch(pathname, deepEqual(data), deepEqual({ params }))
    ).once();

    expect(result).toEqual(data);
  });
});
