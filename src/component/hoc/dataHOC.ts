import { RouteComponentProps } from "react-router";
import {
  compose,
  lifecycle,
  ReactLifeCycleFunctions,
  withProps
} from "recompose";
import withStateHandlers from "recompose/withStateHandlers";
import { StrictOmit } from "ts-essentials";
import defaultRepository from "../../repository/dataRepository";
import { appendURLQuery as defaultAppendURLQuery } from "../../utils";

function or<T>(value1: T | undefined, value2: T) {
  return value1 !== undefined && value1 !== null ? value1 : value2;
}

// ############################ AUTO URL DATA SYNC ############################

export interface URLDataSyncInProps<Data>
  extends Pick<RouteComponentProps<any>, "history" | "location"> {
  readonly data: Data | undefined;
  readonly dataError: Error | undefined;
  readonly isLoadingData: boolean;

  getData(): void;
  setData(data?: Partial<Data>): void;
  setDataError(error?: Error): void;
  setIsLoadingData(isLoadingData?: boolean): void;
  saveData(): void;
  updateData(data: Partial<Data>): void;
}

export interface URLDataSyncOutProps
  extends Pick<RouteComponentProps<any>, "history" | "location"> {
  overrideConfiguration?: StrictOmit<
    HTTPClient.Config,
    "data" | "method" | "params"
  >;

  syncRepository?: typeof defaultRepository;
}

/**
 * Automatically sync with current URL by requesting data from server using
 * said URL. This is assuming there is data provided by the server at current
 * URL, e.g. user navigates to /users/1, this will send a GET request to
 * /users/1, which should have a defined backend route that contains the
 * relevant data.
 *
 * This HOC is usually used for components rendered by a Route. Please make sure
 * when implementing the backend to handle these requests that it never returns
 * null/undefined (as per REST design standards).
 */
export function urlDataSyncHOC<Data>(
  syncRepository: typeof defaultRepository = defaultRepository,
  overrideConfig: URLDataSyncOutProps["overrideConfiguration"] = {}
): FunctionalEnhancer<URLDataSyncInProps<Data>, URLDataSyncOutProps> {
  function getSyncRepository({
    syncRepository: injectedRepository = syncRepository
  }: URLDataSyncOutProps): typeof defaultRepository {
    return injectedRepository;
  }

  function getOverrideConfiguration({
    overrideConfiguration = overrideConfig
  }: URLDataSyncOutProps): typeof overrideConfig {
    return overrideConfiguration;
  }

  async function callAPI<T>(
    { setDataError, setIsLoadingData }: URLDataSyncInProps<Data>,
    callFn: () => Promise<T>,
    successFn: (res: T) => void
  ) {
    setDataError(undefined);
    setIsLoadingData(true);

    try {
      const res = await callFn();
      successFn(res);
    } catch (e) {
      setDataError(e);
    } finally {
      setIsLoadingData(false);
    }
  }

  function getData(props: URLDataSyncInProps<Data>, extraQuery?: URLQueryMap) {
    const { location, setData } = props;

    return callAPI(
      props,
      () => {
        const syncRepository = getSyncRepository(props);
        const overrideConfig = getOverrideConfiguration(props);

        return syncRepository.get<Data>(location, {
          params: extraQuery,
          ...overrideConfig
        });
      },
      setData
    );
  }

  return compose(
    withStateHandlers(
      () => ({
        data: undefined as Data | undefined,
        dataError: undefined as Error | undefined,
        isLoadingData: false
      }),
      {
        setData: () => data => ({ data }),
        setDataError: () => dataError => ({ dataError }),
        setIsLoadingData: () => isLoadingData => ({ isLoadingData })
      }
    ),
    withProps<
      Partial<URLDataSyncInProps<Data>>,
      URLDataSyncInProps<Data> & URLDataSyncOutProps
    >(props => ({
      getData: () => getData(props),
      saveData: () => {
        const { data, location, setData } = props;

        callAPI(
          props,
          () => {
            const syncRepository = getSyncRepository(props);
            const overrideConfig = getOverrideConfiguration(props);

            return syncRepository.update<Data | undefined>(
              location,
              data,
              overrideConfig
            );
          },
          setData
        );
      },
      updateData: (newData: Partial<Data>) => {
        const { data, setData } = props;
        setData(Object.assign({}, data, newData));
      }
    })),
    lifecycle(
      ((): ReactLifeCycleFunctions<URLDataSyncInProps<Data>, {}> => {
        let stateSubscription: Subscription | undefined = undefined;

        return {
          componentDidMount() {
            const { history, getData } = this.props;
            const syncRepository = getSyncRepository(this.props);

            stateSubscription = syncRepository.onURLStateChange(
              history,
              (...[, action]) => {
                switch (action) {
                  case "REPLACE":
                    getData();
                    break;

                  default:
                    break;
                }
              }
            );
          },
          componentWillUnmount() {
            !!stateSubscription && stateSubscription.unsubscribe();
          }
        };
      })()
    )
  );
}

// ############################# CURSOR PAGINATION #############################

export interface CursorPaginatedData<T> {
  readonly results: readonly T[];
  readonly limit?: number;
  readonly order?: string;
  readonly sortField?: Extract<keyof T, string>;
  readonly next?: string;
  readonly previous?: string;
  readonly hasNext?: boolean;
  readonly hasPrevious?: boolean;
}

// ############################### FULL MANAGED ###############################

export interface URLCursorPaginatedSyncInProps<T>
  extends StrictOmit<URLDataSyncInProps<readonly T[]>, "data">,
    Pick<
      CursorPaginatedData<T>,
      "hasNext" | "hasPrevious" | "limit" | "order" | "sortField"
    > {
  readonly data: readonly T[];
  goToNextPage(): void;
  goToPreviousPage(): void;
}

export interface URLCursorPaginatedSyncOutProps extends URLDataSyncOutProps {}

/**
 * This HOC automatically manages pagination data sync, and is best used to
 * display table data. For other kinds of data use the data sync HOC.
 */
export function urlCursorPaginatedSyncHOC<T>(
  syncRepository: typeof defaultRepository = defaultRepository,
  overrideConfig: URLDataSyncOutProps["overrideConfiguration"] = {},
  appendURLQuery = defaultAppendURLQuery
): FunctionalEnhancer<
  URLCursorPaginatedSyncInProps<T>,
  URLCursorPaginatedSyncOutProps
> {
  return compose<any, any>(
    urlDataSyncHOC(syncRepository, overrideConfig),
    withProps((props: any) => ({
      goToNextPage: () => {
        const { data, history, location } = props;
        const { next } = or(data, { next: undefined });
        appendURLQuery(history, location, { next, previous: undefined });
      },
      goToPreviousPage: () => {
        const { data, history, location } = props;
        const { previous } = or(data, { previous: undefined });
        appendURLQuery(history, location, { next: undefined, previous });
      }
    })),
    withProps(({ data }: any) => {
      const { hasNext, hasPrevious, limit, order, results, sortField } = or<
        CursorPaginatedData<T>
      >(data, { results: [] });

      return {
        data: or<readonly T[]>(results, []),
        hasNext,
        hasPrevious,
        limit,
        order,
        sortField
      };
    })
  );
}
