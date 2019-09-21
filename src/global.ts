import { AxiosRequestConfig } from "axios";
import { ComponentType } from "react";
import { Action } from "redux";
import { StrictOmit } from "ts-essentials";
import { getURLComponents, getURLQuery } from "./utils";

declare global {
  interface Subscription {
    unsubscribe(): void;
  }

  type FunctionalEnhancer<I, O> = (c: ComponentType<I>) => ComponentType<O>;

  type URLQueryMap = Readonly<{
    [K: string]: readonly (string)[] | string | undefined;
  }>;

  type URLQueryArrayMap = Readonly<{
    [K: string]: readonly (string)[] | undefined;
  }>;

  /** Common Redux state type that contains some basic properties. */
  interface ReduxState {}

  /** Common Redux action type that contains a payload. */
  interface ReduxAction<Payload = unknown> extends Action<string> {
    payload: Payload;
  }

  namespace HTTPClient {
    type Config = Pick<
      AxiosRequestConfig,
      "baseURL" | "data" | "headers" | "method" | "url"
    > &
      Readonly<{ params?: URLQueryMap }>;
  }

  /** Standard HTTP client that can perform API requests. */
  interface HTTPClient {
    fetch<T>(config: HTTPClient.Config): Promise<T>;
  }

  namespace Repository {
    namespace URLDataSync {
      type OverrideConfig = StrictOmit<HTTPClient.Config, "data" | "method">;
    }

    interface URLDataSync {
      get<T>(
        location: Parameters<typeof getURLComponents>[0],
        override?: URLDataSync.OverrideConfig
      ): Promise<T>;

      update<T>(
        location: Parameters<typeof getURLQuery>[0],
        data: T,
        override?: URLDataSync.OverrideConfig
      ): Promise<T>;
    }
  }
}
