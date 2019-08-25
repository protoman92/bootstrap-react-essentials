import { deepEqual, instance, spy, verify } from "ts-mockito";
import { createRelativeHTTPClient } from "./client";

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
    httpClient = spy<HTTPClient>({ call: () => Promise.resolve({} as any) });
    relativeClient = createRelativeHTTPClient(
      { location },
      instance(httpClient)
    );
  });

  it("Verb operations should work", async () => {
    // Setup
    const apiOrigin = "https://example.com/api";

    // When
    await relativeClient.call("", { method: "get" });
    await relativeClient.call("", { method: "post" });
    await relativeClient.call("", { method: "patch" });
    await relativeClient.call("", { method: "delete" });
    await relativeClient.call("", { method: "head" });

    // Then
    verify(httpClient.call(apiOrigin, deepEqual({ method: "get" }))).once();
    verify(httpClient.call(apiOrigin, deepEqual({ method: "post" }))).once();
    verify(httpClient.call(apiOrigin, deepEqual({ method: "patch" }))).once();
    verify(httpClient.call(apiOrigin, deepEqual({ method: "delete" }))).once();
    verify(httpClient.call(apiOrigin, deepEqual({ method: "head" }))).once();
  });
});
