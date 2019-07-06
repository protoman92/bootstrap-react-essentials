import querystring from "querystring";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  { history, location }: Pick<Window, "history" | "location">,
  client: RelativeHTTPClient
): Repository.URLDataSync {
  function urlParams() {
    return { ...querystring.parse(location.search.slice(1)) };
  }

  return {
    get: () => client.get(location.pathname, { params: urlParams() }),
    update: newData =>
      client.patch(location.pathname, newData, { params: urlParams() }),
    updateURLQuery: async query => {
      const search = `?${querystring.stringify(query)}`;
      history.replaceState({}, "", search);
    }
  };
}
