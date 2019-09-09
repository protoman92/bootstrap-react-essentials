import axios, { AxiosInstance } from "axios";
import path from "path";

/* istanbul ignore next */
export function createHTTPClient(
  global: Pick<typeof window, "location"> = window,
  client: AxiosInstance = axios
): HTTPClient {
  return {
    fetch: ({
      baseURL = path.join(global.location.origin, "api"),
      url = global.location.pathname,
      ...config
    }) => client({ ...config, baseURL, url }).then(({ data }) => data)
  };
}

/* istanbul ignore next */
export default createHTTPClient();
