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
  const origin = "123";

  const location = {
    origin,
    pathname: "",
    search: "",
    state: {},
    hash: "",
    ancestorOrigins: [] as any,
    host: "",
    hostname: "",
    href: "",
    port: "",
    protocol: "",
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
    // Setup && When
    await relativeClient.get("");
    await relativeClient.post("", {});
    await relativeClient.patch("", {});
    await relativeClient.delete("", {});
    await relativeClient.head("");

    // Then
    verify(httpClient.get(origin, undefined)).once();
    verify(httpClient.post(origin, deepEqual({}), undefined)).once();
    verify(httpClient.patch(origin, deepEqual({}), undefined)).once();
    verify(httpClient.delete(origin, deepEqual({}), undefined)).once();
    verify(httpClient.head(origin, undefined)).once();
  });
});
