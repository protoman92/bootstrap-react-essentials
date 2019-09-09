import querystring from "querystring";
import httpClient from "../http/httpClient";
import { getURLQuery, replaceURLQuery } from "../utils";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  global: Pick<Window, "history" | "historyWithCallbacks" | "location">,
  client: HTTPClient
): Repository.URLDataSync {
  function urlParams(additionalQuery?: URLQueryMap) {
    return {
      ...additionalQuery,
      ...querystring.parse(global.location.search.slice(1))
    };
  }

  const urlDataSync: Repository.URLDataSync = {
    get: additionalQuery =>
      client.fetch({
        method: "get",
        params: urlParams(additionalQuery)
      }),
    getURLQuery: () => getURLQuery(global.location),
    onURLStateChange: (...args) =>
      global.historyWithCallbacks.onStateChange(...args),
    update: data =>
      client.fetch({
        data,
        method: "patch",
        params: urlParams()
      }),
    replaceURLQuery: query =>
      replaceURLQuery(global.historyWithCallbacks, query)
  };

  return urlDataSync;
}

/* istanbul ignore next */
export default createURLDataSyncRepository(window, httpClient);
