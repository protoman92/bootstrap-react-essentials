import { AxiosRequestConfig } from "axios";
import H from "history";
import { ComponentType } from "react";
import { Action } from "redux";
import { StrictOmit } from "ts-essentials";
import { getURLComponents, getURLQuery, replaceURLQuery } from "./utils";

declare module "recompose" {}

declare global {
  namespace HistoryWithCallbacks {
    type StateChangeCallback = (
      event: "pushState" | "replaceState",
      data: any,
      title: string,
      url?: string | null
    ) => void;
  }

  interface HistoryWithCallbacks extends History {
    onStateChange(fn: HistoryWithCallbacks.StateChangeCallback): Subscription;
  }

  interface Window {
    historyWithCallbacks: HistoryWithCallbacks;
  }
}

declare global {
  interface Workarounds {
    apply(): void;
  }

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

      getURLQuery(...args: Parameters<typeof getURLComponents>): URLQueryMap;

      onURLStateChange(
        history: Pick<H.History, "listen">,
        cb: H.LocationListener
      ): Subscription;

      update<T>(
        location: Parameters<typeof getURLQuery>[0],
        data: T,
        override?: URLDataSync.OverrideConfig
      ): Promise<T>;

      /** Update URL query without reloading the page. */
      replaceURLQuery(...args: Parameters<typeof replaceURLQuery>): void;
    }
  }
}
