import querystring from "querystring";
import httpClient from "../http/relativeHTTPClient";
import { getURLQuery, updateURLQuery } from "../utils";

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
    update: data =>
      client.fetch(location.pathname, {
        data,
        method: "patch",
        params: urlParams()
      }),
    updateURLQuery: query => updateURLQuery({ history }, query),
    getURLQuery: () => getURLQuery({ location })
  };

  return urlDataSync;
}

/* istanbul ignore next */
export default createURLDataSyncRepository(window, httpClient);
