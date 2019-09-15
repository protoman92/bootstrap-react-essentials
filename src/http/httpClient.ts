import axios, { AxiosInstance } from "axios";
import querystring from "querystring";
import { getURLComponents } from "../utils";

/* istanbul ignore next */
export function createHTTPClient(
  global: Pick<typeof window, "location"> = window,
  client: AxiosInstance = axios
): HTTPClient {
  return {
    fetch: ({
      baseURL = "/api",
      url = getURLComponents(global.location).pathname,
      params = {},
      ...config
    }) => {
      const paramString = querystring.stringify(params);

      return client({
        ...config,
        baseURL,
        url,
        params: new URLSearchParams(paramString)
      }).then(({ data }) => data);
    }
  };
}

/* istanbul ignore next */
export default createHTTPClient();
