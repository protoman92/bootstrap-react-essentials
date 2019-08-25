import axios from "axios";

/* istanbul ignore next */
export function createHTTPClient(client: typeof axios = axios): HTTPClient {
  return {
    call: (url, config) => client(url, config).then(({ data }) => data)
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
export function createRelativeHTTPClient(
  { location }: Pick<Window, "location">,
  client: HTTPClient
): HTTPClient {
  function getFullURL(url: string): string {
    const { origin } = location;
    return `${origin}/api${url}`;
  }

  return {
    call: (url, config) => {
      const fullURL = getFullURL(url);
      return client.call(fullURL, config);
    }
  };
}
