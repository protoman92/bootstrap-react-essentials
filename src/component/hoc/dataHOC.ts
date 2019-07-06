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
}

/**
 * Automatically sync with current URL by requesting data from server using
 * said URL. This is assuming there is data provided by the server at current
 * URL, e.g. user navigates to /users/1, this will send a GET request to
 * /users/1, which should have a defined backend route that contains the
 * relevant data.
 */
export function autoURLDataSync<Data>(): ComponentEnhancer<
  AutoURLDataSyncProps<Data>,
  {}
> {
  return compose(
    withState("data", "setData", undefined),
    withState("isLoadingData", "setIsLoadingData", false),
    connect(({ repository: { urlDataSync } }: ReduxState) => ({
      urlDataSync
    })),
    lifecycle({
      async componentDidMount() {
        const { setIsLoadingData, urlDataSync } = this.props as any;

        try {
          setIsLoadingData(true);
          const data = await urlDataSync.get();
          (this.props as any).setData(data);
        } finally {
          setIsLoadingData(false);
        }
      }
    }),
    mapProps<any, any>(
      ({ urlDataSync, data, setData, setIsLoadingData, ...rest }) => ({
        ...rest,
        data,
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
          setData(Object.assign({}, data, newData))
      })
    )
  );
}
