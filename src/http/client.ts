import axios, { AxiosRequestConfig } from "axios";

export function createHTTPClient(
  client: Pick<
    typeof axios,
    "get" | "post" | "patch" | "delete" | "head"
  > = axios,
  baseURL: string
): HTTPClient {
  const baseHeaders = { "Content-Type": "application/json" };

  function createConfig(config?: HTTPClient.Config): AxiosRequestConfig {
    return {
      ...config,
      headers: { ...baseHeaders, ...(!!config ? config.headers : {}) },
      baseURL
    };
  }

  return {
    get: (url, config) =>
      client.get(url, createConfig(config)).then(({ data }) => data),
    post: (url, body, config) =>
      client.post(url, body, createConfig(config)).then(({ data }) => data),
    patch: (url, body, config) =>
      client.patch(url, body, createConfig(config)).then(({ data }) => data),
    delete: (url, body, config) =>
      client
        .delete(url, createConfig({ ...config, data: body }))
        .then(({ data }) => data),
    head: (url, config) => client.head(url, createConfig(config))
  };
}
