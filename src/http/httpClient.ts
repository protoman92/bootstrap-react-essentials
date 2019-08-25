import axios from "axios";

/* istanbul ignore next */
export function createHTTPClient(client: typeof axios = axios): HTTPClient {
  return {
    fetch: (url, config) => client(url, config).then(({ data }) => data)
  };
}

/* istanbul ignore next */
export default createHTTPClient(axios);
