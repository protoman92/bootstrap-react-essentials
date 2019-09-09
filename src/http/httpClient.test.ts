import { AxiosPromise } from "axios";
import path from "path";
import { createHTTPClient } from "./httpClient";

describe("Relative HTTP client", () => {
  const location = {
    origin: "https://example.com",
    pathname: "/path/subpath",
    protocol: "",
    host: "",
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

  let axiosClient: jest.Mock<AxiosPromise<{}>>;
  let httpClient: HTTPClient;

  beforeEach(() => {
    axiosClient = jest.fn();
    httpClient = createHTTPClient({ location }, axiosClient as any);
  });

  it("Should use default baseURL and url if none provided", async () => {
    // Setup
    axiosClient.mockResolvedValue({
      data: {},
      status: 0,
      statusText: "",
      headers: {},
      config: {}
    });

    // Then
    await httpClient.fetch({});

    // Then
    expect(axiosClient).toHaveBeenCalledWith({
      baseURL: path.join(location.origin, "api"),
      url: location.pathname
    });
  });
});
