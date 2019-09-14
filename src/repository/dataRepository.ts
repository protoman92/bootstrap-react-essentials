import httpClient from "../http/httpClient";
import { getURLQuery, replaceURLQuery } from "../utils";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  global: Pick<Window, "history" | "historyWithCallbacks" | "location">,
  client: HTTPClient
): Repository.URLDataSync {
  function urlParams() {
    return getURLQuery(global.location);
  }

  function prepareConfig(
    {
      headers: defaultHeaders,
      params: defaultParams,
      ...defaultConfig
    }: HTTPClient.Config = {},
    { headers, params, ...config }: HTTPClient.Config = {}
  ): HTTPClient.Config {
    return {
      ...defaultConfig,
      ...config,
      headers: { ...defaultHeaders, ...headers },
      params: { ...defaultParams, ...params }
    };
  }

  const urlDataSync: Repository.URLDataSync = {
    get: overrideConfig => {
      const config = prepareConfig(
        {
          method: "get",
          params: urlParams()
        },
        overrideConfig
      );

      return client.fetch(config);
    },
    getURLQuery: () => getURLQuery(global.location),
    onURLStateChange: (...args) =>
      global.historyWithCallbacks.onStateChange(...args),
    update: (data, overrideConfig) => {
      const config = prepareConfig(
        {
          data,
          method: "patch",
          params: urlParams()
        },
        overrideConfig
      );

      return client.fetch(config);
    },
    replaceURLQuery: query =>
      replaceURLQuery(global.historyWithCallbacks, global.location, query)
  };

  return urlDataSync;
}

/* istanbul ignore next */
export default createURLDataSyncRepository(window, httpClient);
