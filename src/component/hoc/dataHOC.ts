import { connect } from "react-redux";
import { mapProps } from "recompose";
import { mergeQueryMaps } from "../../utils";
import { createEnhancerChain, lifecycle, withState } from "./betterRecompose";

export interface AutoURLDataSyncRepository {}

export interface AutoURLDataSyncProps<Data> {
  readonly data: Data;
  readonly dataError: Error | null | undefined;
  readonly isLoadingData: boolean;
  readonly urlQuery: URLQueryMap;
  saveData(): void;
  updateData(data: Partial<Data>): void;

  /** Update URL query parameters without reloading and trigger a re-sync. */
  updateURLQuery(...queries: readonly URLQueryMap[]): void;
}

export interface AutoURLDataSyncEnhancer<Data>
  extends FunctionalEnhancer<AutoURLDataSyncProps<Data>, {}> {}

/**
 * Automatically sync with current URL by requesting data from server using
 * said URL. This is assuming there is data provided by the server at current
 * URL, e.g. user navigates to /users/1, this will send a GET request to
 * /users/1, which should have a defined backend route that contains the
 * relevant data.
 * This HOC is usually used for components rendered by a Route.
 * Please make sure when implementing the backend to handle these requests
 * that it never returns null/undefined (as per REST design standards).
 */
export function autoURLDataSync<Data>(
  initial: Data
): AutoURLDataSyncEnhancer<Data> {
  return createEnhancerChain()
    .compose(
      connect(({ repository: { urlDataSync } }: ReduxState) => ({
        urlDataSync
      }))
    )
    .compose(withState("data", "setData", initial))
    .compose(withState("dataError", "setDataError", null as Error | null))
    .compose(withState("isLoadingData", "setIsLoadingData", false))
    .compose(withState("urlQuery", "setURLQuery", {} as URLQueryMap))
    .compose(
      mapProps(
        ({
          urlDataSync,
          data,
          setData,
          setDataError,
          setIsLoadingData,
          setURLQuery,
          ...rest
        }) => {
          const getData = async () => {
            try {
              setIsLoadingData(true);
              const newData = await urlDataSync.get<Data>();
              setData(newData);
            } catch (e) {
              setDataError(e);
            } finally {
              setIsLoadingData(false);
            }
          };

          return {
            ...rest,
            data,
            getData,
            setURLQuery,
            urlDataSync,
            saveData: async () => {
              try {
                setIsLoadingData(true);
                const updated = await urlDataSync.update(data);
                setData(updated);
              } catch (e) {
                setDataError(e);
              } finally {
                setIsLoadingData(false);
              }
            },
            updateData: (newData: Partial<Data>) =>
              setData(Object.assign({}, data, newData)),
            updateURLQuery: async (...queries: readonly URLQueryMap[]) => {
              setURLQuery(mergeQueryMaps(...queries));
              await urlDataSync.updateURLQuery(...queries);
              await getData();
            }
          };
        }
      )
    )
    .compose(
      lifecycle({
        async componentDidMount() {
          const { urlDataSync, getData, setURLQuery } = this.props;
          const query = await urlDataSync.getURLQuery();
          setURLQuery(query);
          await getData();
        }
      })
    ).enhance;
}
