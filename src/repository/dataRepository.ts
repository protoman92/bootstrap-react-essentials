import querystring from "querystring";

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

  return {
    get: additionalQuery =>
      client.get(location.pathname, { params: urlParams(additionalQuery) }),
    update: newData =>
      client.patch(location.pathname, newData, { params: urlParams() }),
    updateURLQuery: async query => {
      const merged = querystring.stringify(query);
      history.replaceState({}, "", !!merged ? `?${merged}` : "");
    },
    getURLQuery: async () => {
      const { search } = location;
      return querystring.parse(search.slice(1));
    }
  };
}
