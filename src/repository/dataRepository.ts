import querystring from "querystring";
import httpClient from "../http/relativeHTTPClient";
import { getURLQuery, replaceURLQuery } from "../utils";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  { history, location }: Pick<Window, "history" | "location">,
  client: HTTPClient
): Repository.URLDataSync {
  function urlParams(additionalQuery?: URLQueryMap) {
    return {
      ...additionalQuery,
      ...querystring.parse(location.search.slice(1))
    };
  }

  const urlDataSync: Repository.URLDataSync = {
    get: additionalQuery =>
      client.fetch(location.pathname, {
        method: "get",
        params: urlParams(additionalQuery)
      }),
    getURLQuery: () => getURLQuery({ location }),
    onURLStateChanges: (...args) => history.onStateChange(...args),
    update: data =>
      client.fetch(location.pathname, {
        data,
        method: "patch",
        params: urlParams()
      }),
    replaceURLQuery: query => replaceURLQuery({ history }, query)
  };

  return urlDataSync;
}

/* istanbul ignore next */
export default createURLDataSyncRepository(window, httpClient);
