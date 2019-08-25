import { deepEqual, instance, spy, verify } from "ts-mockito";
import { createRelativeHTTPClient } from "./relativeHTTPClient";

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
  let relativeClient: HTTPClient;

  beforeEach(() => {
    httpClient = spy<HTTPClient>({ fetch: () => Promise.resolve({} as any) });
    relativeClient = createRelativeHTTPClient(
      { location },
      instance(httpClient)
    );
  });

  it("Verb operations should work", async () => {
    // Setup
    const apiOrigin = "https://example.com/api";

    // When
    await relativeClient.fetch("", { method: "get" });
    await relativeClient.fetch("", { method: "post" });
    await relativeClient.fetch("", { method: "patch" });
    await relativeClient.fetch("", { method: "delete" });
    await relativeClient.fetch("", { method: "head" });

    // Then
    verify(httpClient.fetch(apiOrigin, deepEqual({ method: "get" }))).once();
    verify(httpClient.fetch(apiOrigin, deepEqual({ method: "post" }))).once();
    verify(httpClient.fetch(apiOrigin, deepEqual({ method: "patch" }))).once();
    verify(httpClient.fetch(apiOrigin, deepEqual({ method: "delete" }))).once();
    verify(httpClient.fetch(apiOrigin, deepEqual({ method: "head" }))).once();
  });
});
