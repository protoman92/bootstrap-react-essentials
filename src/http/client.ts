import axios from "axios";
import { apiHost } from "../utils";

export function createBaseClient(
  client: Pick<
    typeof axios,
    "get" | "post" | "patch" | "delete" | "head"
  > = axios
): HTTPClient {
  const baseHeaders = { "Content-Type": "application/json" };

  function createConfig(config?: HTTPClient.Config): HTTPClient.Config {
    return {
      ...config,
      headers: { ...baseHeaders, ...(!!config ? config.headers : {}) }
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

/**
 * Treat client and server as if originating from the same domain, and whatever
 * URL the client is at, the server has the corresponding URL that contains the
 * data. This is assuming there is a subdomain called "api" for the server at
 * the same domain.
 *
 * e.g.
 * client -> https://localhost:8000/users/
 * server -> https://api.localhost:8000/users/1
 */
export function createRelativeClient(
  { location }: Pick<Window, "location">,
  client: HTTPClient
): RelativeHTTPClient {
  function getFullURL(url: string): string {
    const { protocol, host } = location;
    return `${protocol}://${apiHost(host)}${url}`;
  }

  return {
    get: (url, config) => client.get(getFullURL(url), config),
    post: (url, body, config) => client.post(getFullURL(url), body, config),
    patch: (url, body, config) => client.patch(getFullURL(url), body, config),
    delete: (url, body, config) => client.delete(getFullURL(url), body, config),
    head: (url, config) => client.head(getFullURL(url), config)
  };
}
