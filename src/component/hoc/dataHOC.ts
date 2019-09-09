import {
  compose,
  lifecycle,
  ReactLifeCycleFunctions,
  withProps
} from "recompose";
import withStateHandlers from "recompose/withStateHandlers";
import { StrictOmit } from "ts-essentials";
import defaultRepository from "../../repository/dataRepository";

function or<T>(value1: T | undefined, value2: T) {
  return value1 !== undefined && value1 !== null ? value1 : value2;
}

// ############################ AUTO URL DATA SYNC ############################

export interface URLDataSyncInProps<Data> {
  readonly data: Data | null | undefined;
  readonly dataError: Error | null | undefined;
  readonly isLoadingData: boolean;

  getData(): void;
  saveData(): void;
  updateData(data: Partial<Data>): void;
  getURLQuery(): URLQueryMap;

  /** Update URL query parameters without reloading and trigger a re-sync. */
  replaceURLQuery(query: URLQueryMap): void;

  /** Instead of setting URL query, append to existing URL query. */
  appendURLQuery(query: URLQueryMap): void;
}

export interface URLDataSyncOutProps<Data> {
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
export function urlDataSyncHOC<Data, OutProps = {}>(
  syncRepository: typeof defaultRepository = defaultRepository
): FunctionalEnhancer<
  URLDataSyncInProps<Data> & OutProps,
  URLDataSyncOutProps<Data> & OutProps
> {
  function getSyncRepository({
    syncRepository: injectedRepository
  }: any): typeof defaultRepository {
    return injectedRepository || syncRepository;
  }

  async function callAPI<T>(
    { setDataError, setIsLoadingData }: any,
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

  function getData(props: any, additionalQuery?: URLQueryMap) {
    const { setData } = props;

    return callAPI(
      props,
      () => getSyncRepository(props).get({ params: additionalQuery }),
      setData
    );
  }

  async function replaceURLQuery(props: any, query: URLQueryMap) {
    await getSyncRepository(props).replaceURLQuery(query);
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
    withProps((props: any) => ({
      appendURLQuery: async (query: URLQueryMap) => {
        const urlQuery = await getSyncRepository(props).getURLQuery();
        replaceURLQuery(props, { ...urlQuery, ...query });
      },
      getData: () => getData(props),
      getURLQuery: () => getSyncRepository(props).getURLQuery(),
      replaceURLQuery: (query: URLQueryMap) => replaceURLQuery(props, query),
      saveData: () => {
        const { data, setData } = props;
        callAPI(props, () => getSyncRepository(props).update(data), setData);
      },
      updateData: (newData: Partial<Data>) => {
        const { data, setData } = props;
        setData(Object.assign({}, data, newData));
      }
    })),
    lifecycle(
      ((): ReactLifeCycleFunctions<any, any> => {
        let urlStateSubscription: Subscription | undefined = undefined;

        return {
          componentDidMount() {
            const { getData } = this.props;

            urlStateSubscription = getSyncRepository(
              this.props
            ).onURLStateChange(event => {
              switch (event) {
                case "replaceState":
                  getData();
                  break;

                default:
                  break;
              }
            });
          },
          componentWillUnmount() {
            !!urlStateSubscription && urlStateSubscription.unsubscribe();
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

export interface URLCursorPaginatedSyncOutProps<T>
  extends URLDataSyncOutProps<CursorPaginatedData<T>> {}

/**
 * This HOC automatically manages pagination data sync, and is best used to
 * display table data. For other kinds of data use the data sync HOC.
 */
export function urlCursorPaginatedSyncHOC<T>(
  syncRepository: typeof defaultRepository = defaultRepository
): FunctionalEnhancer<
  URLCursorPaginatedSyncInProps<T>,
  URLCursorPaginatedSyncOutProps<T>
> {
  return compose<any, any>(
    urlDataSyncHOC(syncRepository),
    withProps((props: any) => ({
      goToNextPage: () => {
        const { data, appendURLQuery } = props;
        const { next } = or(data, { next: undefined });
        appendURLQuery({ next, previous: undefined });
      },
      goToPreviousPage: () => {
        const { data, appendURLQuery } = props;
        const { previous } = or(data, { previous: undefined });
        appendURLQuery({ next: undefined, previous });
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
