import { connect } from "react-redux";
import {
  ComponentEnhancer,
  compose,
  lifecycle,
  mapProps,
  withState
} from "recompose";

export interface AutoURLDataSyncRepository {}

export interface AutoURLDataSyncProps<Data> {
  readonly data: Data | null | undefined;
  readonly isLoadingData: boolean;
  saveData(): void;
  updateData(data: Partial<Data>): void;

  /** Update URL query parameters without reloading and trigger a re-sync. */
  updateURLQuery(
    ...queries: readonly Readonly<{
      [K: string]: readonly (string | number)[] | string | number;
    }>[]
  ): void;
}

/**
 * Automatically sync with current URL by requesting data from server using
 * said URL. This is assuming there is data provided by the server at current
 * URL, e.g. user navigates to /users/1, this will send a GET request to
 * /users/1, which should have a defined backend route that contains the
 * relevant data.
 * This HOC is usually used for components rendered by a Route.
 */
export function autoURLDataSync<Data>(): ComponentEnhancer<
  AutoURLDataSyncProps<Data>,
  {}
> {
  return compose(
    withState("data", "setData", undefined),
    withState("isLoadingData", "setIsLoadingData", false),
    connect(({ repository: { urlDataSync } }: ReduxState) => ({ urlDataSync })),
    mapProps<any, any>(
      ({ urlDataSync, data, history, setData, setIsLoadingData, ...rest }) => {
        const getData = async () => {
          try {
            setIsLoadingData(true);
            const data = await urlDataSync.get();
            setData(data);
          } finally {
            setIsLoadingData(false);
          }
        };

        return {
          ...rest,
          data,
          getData,
          saveData: async () => {
            try {
              setIsLoadingData(true);
              const updated = await urlDataSync.update(data);
              setData(updated);
            } finally {
              setIsLoadingData(false);
            }
          },
          updateData: (newData: Partial<Data>) =>
            setData(Object.assign({}, data, newData)),
          updateURLQuery: async (...queries: readonly {}[]) => {
            await urlDataSync.updateURLQuery(...queries);
            await getData();
          }
        };
      }
    ),
    lifecycle({
      async componentDidMount() {
        (this.props as any).getData();
      }
    })
  );
}
