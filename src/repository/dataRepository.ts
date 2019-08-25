import querystring from "querystring";
import httpClient from "../http/relativeHTTPClient";
import { getURLQuery, replaceURLQuery } from "../utils";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  window: Pick<Window, "history" | "historyWithCallbacks" | "location">,
  client: HTTPClient
): Repository.URLDataSync {
  function urlParams(additionalQuery?: URLQueryMap) {
    return {
      ...additionalQuery,
      ...querystring.parse(window.location.search.slice(1))
    };
  }

  const urlDataSync: Repository.URLDataSync = {
    get: additionalQuery =>
      client.fetch(window.location.pathname, {
        method: "get",
        params: urlParams(additionalQuery)
      }),
    getURLQuery: () => getURLQuery(window),
    onURLStateChange: (...args) =>
      window.historyWithCallbacks.onStateChange(...args),
    update: data =>
      client.fetch(window.location.pathname, {
        data,
        method: "patch",
        params: urlParams()
      }),
    replaceURLQuery: query => replaceURLQuery(window, query)
  };

  return urlDataSync;
}

/* istanbul ignore next */
export default createURLDataSyncRepository(window, httpClient);
