import { AxiosRequestConfig } from "axios";
import { ComponentType } from "react";
import { Action } from "redux";

declare module "recompose" {}

declare global {
  type OmitKeys<T, K extends keyof T> = import("ts-essentials").Omit<T, K>;
  type DeepPartial<T> = import("ts-essentials").DeepPartial<T>;
  type DeepRequired<T> = import("ts-essentials").DeepRequired<T>;
  type DeepReadonly<T> = import("ts-essentials").DeepReadonly<T>;
  type DeepWriteable<T> = import("ts-essentials").DeepWritable<T>;
  type FunctionalEnhancer<I, O> = (c: ComponentType<I>) => ComponentType<O>;

  type URLQueryMap = Readonly<{
    [K: string]: readonly (string)[] | string;
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
    type Config = OmitKeys<AxiosRequestConfig, "baseURL">;
  }

  /** Standard HTTP client that can perform API requests. */
  interface HTTPClient {
    get<T>(url: string, c?: HTTPClient.Config): Promise<T>;
    post<T>(url: string, body: unknown, c?: HTTPClient.Config): Promise<T>;
    patch<T>(url: string, body: unknown, c?: HTTPClient.Config): Promise<T>;
    delete<T>(url: string, body: unknown, c?: HTTPClient.Config): Promise<T>;
    head<T>(url: string, c?: HTTPClient.Config): Promise<T>;
  }

  /**
   * Treat client and server as if originating from the same domain, and
   * whatever URL the client is at, the server has the corresponding URL that
   * contains the data.
   *
   * e.g.
   * client -> https://localhost:8000/users/
   * server -> https://localhost:8000/users/1
   */
  interface RelativeHTTPClient extends HTTPClient {}

  namespace Repository {
    interface URLDataSync {
      get<T>(): Promise<T>;
      update<T>(newData: T): Promise<T>;

      /** Update URL query without reloading the page. */
      updateURLQuery(...queries: readonly URLQueryMap[]): Promise<void>;
      getURLQuery(): Promise<URLQueryMap>;
    }
  }

  /** Common repository that contains some default repositories. */
  interface Repository {
    readonly urlDataSync: Repository.URLDataSync;
  }
}
