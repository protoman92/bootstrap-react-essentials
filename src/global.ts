import { AxiosRequestConfig } from "axios";
import { ComponentType } from "react";
import { Action } from "redux";
import { StrictOmit } from "ts-essentials";

declare module "recompose" {}

declare global {
  type FunctionalEnhancer<I, O> = (c: ComponentType<I>) => ComponentType<O>;

  type URLQueryMap = Readonly<{
    [K: string]: readonly (string)[] | string | undefined;
  }>;

  /** Common Redux state type that contains some basic properties. */
  interface ReduxState {
    readonly repository: Repository;
  }

  /** Common Redux action type that contains a payload. */
  interface ReduxAction<Payload = unknown> extends Action<string> {
    payload: Payload;
  }

  namespace HTTPClient {
    type Config = StrictOmit<AxiosRequestConfig, "baseURL" | "url">;
  }

  /** Standard HTTP client that can perform API requests. */
  interface HTTPClient {
    fetch<T>(url: string, config: HTTPClient.Config): Promise<T>;
  }

  namespace Repository {
    interface URLDataSync {
      get<T>(additionalQuery?: URLQueryMap): Promise<T>;
      update<T>(newData: T): Promise<T>;

      /** Update URL query without reloading the page. */
      updateURLQuery(query: URLQueryMap): void;
      getURLQuery(): URLQueryMap;
    }
  }

  /** Common repository that contains some default repositories. */
  interface Repository {
    readonly urlDataSync: Repository.URLDataSync;
  }
}
