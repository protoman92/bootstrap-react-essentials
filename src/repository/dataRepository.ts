import querystring from "querystring";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  { location }: Pick<Window, "location">,
  client: RelativeHTTPClient
): Repository.URLDataSync {
  function urlParams() {
    return { ...querystring.parse(location.search.slice(1)) };
  }

  return {
    get: () => client.get(location.pathname, { params: urlParams() }),
    update: newData =>
      client.patch(location.pathname, newData, { params: urlParams() })
  };
}
