import axios, { AxiosInstance } from "axios";
import querystring from "querystring";

/* istanbul ignore next */
export function createHTTPClient(client: AxiosInstance = axios): HTTPClient {
  return {
    fetch: ({ params = {}, ...config }) => {
      const paramString = querystring.stringify(params);

      return client({
        ...config,
        params: new URLSearchParams(paramString)
      }).then(({ data }) => data);
    }
  };
}

/* istanbul ignore next */
export default createHTTPClient();
