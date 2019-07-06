import axios from "axios";

export function createBaseClient(): HTTPClient {
  const baseHeaders = { "Content-Type": "application/json" };

  function createConfig(config?: HTTPClient.Config): HTTPClient.Config {
    return { ...baseHeaders, ...(!!config ? config.headers : {}) };
  }

  return {
    get: (url, config) =>
      axios.get(url, createConfig(config)).then(({ data }) => data),
    post: (url, body, config) =>
      axios.post(url, body, createConfig(config)).then(({ data }) => data),
    patch: (url, body, config) =>
      axios.patch(url, body, createConfig(config)).then(({ data }) => data)
  };
}

/**
 * Treat client and server as if originating from the same domain, and whatever
 * URL the client is at, the server has the corresponding URL that contains the
 * data.
 *
 * e.g.
 * client -> https://localhost:8000/users/
 * server -> https://localhost:8000/users/1
 */
export function createRelativeClient(
  window: Window,
  client: HTTPClient
): RelativeHTTPClient {
  function getFullURL(url: string): string {
    return `${window.location.origin}${url}`;
  }

  return {
    get: (url, config) => client.get(getFullURL(url), config),
    post: (url, body, config) => client.post(getFullURL(url), body, config),
    patch: (url, body, config) => client.patch(getFullURL(url), body, config)
  };
}
