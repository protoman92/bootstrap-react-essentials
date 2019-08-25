import querystring from "querystring";
import { updateURLQuery, getURLQuery } from "../utils";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  { history, location }: Pick<Window, "history" | "location">,
  client: RelativeHTTPClient
): Repository.URLDataSync {
  function urlParams(additionalQuery?: URLQueryMap) {
    return {
      ...additionalQuery,
      ...querystring.parse(location.search.slice(1))
    };
  }

  const urlDataSync: Repository.URLDataSync = {
    get: additionalQuery =>
      client.get(location.pathname, { params: urlParams(additionalQuery) }),
    update: newData =>
      client.patch(location.pathname, newData, { params: urlParams() }),
    updateURLQuery: query => updateURLQuery({ history }, query),
    getURLQuery: () => getURLQuery({ location })
  };

  return urlDataSync;
}
