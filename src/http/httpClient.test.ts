import { AxiosPromise } from "axios";
import { createHTTPClient } from "./httpClient";

describe("HTTP client", () => {
  let axiosClient: jest.Mock<AxiosPromise<{}>>;
  let httpClient: HTTPClient;

  beforeEach(() => {
    axiosClient = jest.fn();
    httpClient = createHTTPClient(axiosClient as any);
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
    await httpClient.fetch({ params: { a: ["1", "2"] } });

    // Then
    expect(axiosClient).toHaveBeenCalledWith({
      params: new URLSearchParams("a=1&a=2")
    });
  });
});
