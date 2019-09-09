import { AxiosRequestConfig } from "axios";
import { ComponentType } from "react";
import { Action } from "redux";
import { StrictOmit } from "ts-essentials";

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

  interface HistoryWithCallbacks
    extends Pick<History, "pushState" | "replaceState"> {
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
      "baseURL" | "data" | "headers" | "method" | "params" | "url"
    >;
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
      readonly onURLStateChange: HistoryWithCallbacks["onStateChange"];
      get<T>(override?: URLDataSync.OverrideConfig): Promise<T>;
      getURLQuery(): URLQueryMap;
      update<T>(data: T, override?: URLDataSync.OverrideConfig): Promise<T>;

      /** Update URL query without reloading the page. */
      replaceURLQuery(query: URLQueryMap): void;
    }
  }
}
