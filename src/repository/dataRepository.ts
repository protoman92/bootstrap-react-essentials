import querystring from "querystring";
import { toArray } from "../utils";

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
    updateURLQuery: query => {
      const newQueryMap = Object.entries(query)
        .filter(([, value]) => !!value && !!toArray(value).length)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      const merged = querystring.stringify(newQueryMap);
      history.replaceState({}, "", !!merged ? `?${merged}` : "");
    },
    getURLQuery: () => {
      const { search } = location;
      return querystring.parse(search.slice(1));
    }
  };

  return urlDataSync;
}
