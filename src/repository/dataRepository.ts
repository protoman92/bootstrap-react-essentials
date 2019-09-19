import httpClient from "../http/httpClient";
import { getURLQuery } from "../utils";

/** This repository allows synchronization of data with current URL. */
export function createURLDataSyncRepository(
  client: HTTPClient
): Repository.URLDataSync {
  function urlParams(...args: Parameters<typeof getURLQuery>) {
    return getURLQuery(...args);
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
    get: (location, overrideConfig) => {
      const config = prepareConfig(
        {
          method: "get",
          params: urlParams(location)
        },
        overrideConfig
      );

      return client.fetch(config);
    },
    onURLStateChange: (history, cb) => {
      const unsubscribe = history.listen(cb);
      return { unsubscribe };
    },
    update: (location, data, overrideConfig) => {
      const config = prepareConfig(
        {
          data,
          method: "patch",
          params: urlParams(location)
        },
        overrideConfig
      );

      return client.fetch(config);
    }
  };

  return urlDataSync;
}

/* istanbul ignore next */
export default createURLDataSyncRepository(httpClient);
