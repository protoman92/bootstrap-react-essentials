import { deepEqual, instance, spy, verify, capture } from "ts-mockito";
import { createBaseClient, createRelativeClient } from "./client";

describe("HTTP client", () => {
  let client: NonNullable<Parameters<typeof createBaseClient>[0]>;
  let httpClient: HTTPClient;

  beforeEach(() => {
    client = spy<typeof client>({
      get: () => Promise.resolve({} as any),
      post: () => Promise.resolve({} as any),
      patch: () => Promise.resolve({} as any),
      delete: () => Promise.resolve({} as any),
      head: () => Promise.resolve({} as any)
    });

    httpClient = createBaseClient(instance(client));
  });

  it("Verb operations should work", async () => {
    // Setup
    const params = {
      a: 1,
      b: 2
    };

    // When
    await httpClient.get("", { params });
    await httpClient.post("", {}, { params });
    await httpClient.patch("", {}, { params });
    await httpClient.delete("", { d: 3, e: 4 }, { params });
    await httpClient.head("", { params });

    // Then
    verify(client.get("", deepEqual({ params })));
    verify(client.post("", deepEqual({}), deepEqual({ params })));
    verify(client.patch("", deepEqual({}), deepEqual({ params })));
    verify(client.delete("", deepEqual({ data: { d: 3, e: 4 }, params })));
    verify(client.head("", deepEqual({ params })));
  });
});

describe("Relative HTTP client", () => {
  const origin = "https://example.com";

  const location = {
    origin,
    protocol: "",
    host: "",
    pathname: "",
    search: "",
    state: {},
    hash: "",
    ancestorOrigins: [] as any,
    hostname: "",
    href: "",
    port: "",
    assign: () => {},
    reload: () => {},
    replace: () => {}
  };

  let httpClient: HTTPClient;
  let relativeClient: RelativeHTTPClient;

  beforeEach(() => {
    httpClient = spy<HTTPClient>({
      get: () => Promise.resolve({} as any),
      post: () => Promise.resolve({} as any),
      patch: () => Promise.resolve({} as any),
      delete: () => Promise.resolve({} as any),
      head: () => Promise.resolve({} as any)
    });

    relativeClient = createRelativeClient({ location }, instance(httpClient));
  });

  it("Verb operations should work", async () => {
    // Setup
    const apiOrigin = "https://example.com/api";

    // When
    await relativeClient.get("");
    await relativeClient.post("", {});
    await relativeClient.patch("", {});
    await relativeClient.delete("", {});
    await relativeClient.head("");

    // Then
    verify(httpClient.get(apiOrigin, undefined)).once();
    verify(httpClient.post(apiOrigin, deepEqual({}), undefined)).once();
    verify(httpClient.patch(apiOrigin, deepEqual({}), undefined)).once();
    verify(httpClient.delete(apiOrigin, deepEqual({}), undefined)).once();
    verify(httpClient.head(apiOrigin, undefined)).once();
  });
});
