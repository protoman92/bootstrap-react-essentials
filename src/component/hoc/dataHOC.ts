import { Location } from "history";
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
import {
  appendURLQuery as defaultAppendURLQuery,
  getURLQuery
} from "../../utils";
import deepEqual = require("deep-equal");

function or<T>(value1: T | undefined, value2: T) {
  return value1 !== undefined && value1 !== null ? value1 : value2;
}

// ############################ AUTO URL DATA SYNC ############################

export interface URLDataSyncInProps<Data>
  extends Pick<RouteComponentProps<any>, "history" | "location"> {
  readonly data: Data | undefined;
  readonly dataError: Error | undefined;
  readonly isLoadingData: boolean;

  /**
   * Specify the query parameter keys to observe. Only the values for these
   * keys are changed do we force a refetch. Leave undefined if we want all
   * keys to be observed, or an empty array if we do not want any key to be
   * observed.
   */
  readonly queryParametersToWatch?: readonly string[];
  getData(): void;
  onDataSynchronized?(newData: Partial<Data>): void;
  onDataErrorEncountered?(error: Error): void;
  setData(data?: Partial<Data>): void;
  setDataError(error?: Error): void;
  setIsLoadingData(isLoadingData?: boolean): void;
  saveData(): void;
  updateData(data: Partial<Data>): void;
}

export interface URLDataSyncOutProps<Data>
  extends Pick<
    URLDataSyncInProps<Data>,
    | "history"
    | "location"
    | "onDataErrorEncountered"
    | "onDataSynchronized"
    | "queryParametersToWatch"
  > {
  overrideConfiguration?: HTTPClient.Config;
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
  overrideConfig: URLDataSyncOutProps<Data>["overrideConfiguration"] = {},
  queryParamsToObserve: URLDataSyncOutProps<
    Data
  >["queryParametersToWatch"] = undefined
): FunctionalEnhancer<URLDataSyncInProps<Data>, URLDataSyncOutProps<Data>> {
  function getSyncRepository({
    syncRepository: injectedRepository = syncRepository
  }: Pick<URLDataSyncOutProps<Data>, "syncRepository">) {
    return injectedRepository;
  }

  function getOverrideConfiguration({
    overrideConfiguration = overrideConfig
  }: Pick<URLDataSyncOutProps<Data>, "overrideConfiguration">) {
    return overrideConfiguration;
  }

  function getQueryParametersToWatch({
    queryParametersToWatch = queryParamsToObserve
  }: URLDataSyncOutProps<Data>): typeof queryParamsToObserve {
    return queryParametersToWatch;
  }

  async function callAPI<T>(
    {
      onDataErrorEncountered,
      setDataError,
      setIsLoadingData
    }: Pick<
      URLDataSyncInProps<Data>,
      "onDataErrorEncountered" | "setDataError" | "setIsLoadingData"
    >,
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
      !!onDataErrorEncountered && onDataErrorEncountered(e);
    } finally {
      setIsLoadingData(false);
    }
  }

  function getData(
    {
      history: { location },
      ...props
    }: URLDataSyncInProps<Data> & URLDataSyncOutProps<Data>,
    injectedLocation?: typeof location
  ) {
    const customLocation = injectedLocation || location;
    const { onDataSynchronized, setData } = props;

    return callAPI(
      props,
      () => {
        const syncRepository = getSyncRepository(props);
        const overrideConfig = getOverrideConfiguration(props);

        return syncRepository.get<Data>(customLocation, {
          url: customLocation.pathname,
          ...overrideConfig
        });
      },
      data => {
        setData(data);
        onDataSynchronized && onDataSynchronized(data);
      }
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
      URLDataSyncInProps<Data> & URLDataSyncOutProps<Data>
    >(props => ({
      getData: () => getData(props),
      /** When the history listener triggers, use the newest location. */
      getDataWithCustomLocation: (l: Location) => getData(props, l),
      saveData: () => {
        const {
          data,
          history: { location },
          setData
        } = props;

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
      ((): ReactLifeCycleFunctions<
        URLDataSyncInProps<Data> &
          Readonly<{ getDataWithCustomLocation: (l: Location) => void }>,
        {}
      > => {
        let stateListener: (() => void) | undefined = undefined;

        return {
          componentDidMount() {
            const { history } = this.props;
            let oldQuery = getURLQuery(history.location);

            stateListener = history.listen((l, a) => {
              if (a !== "REPLACE") return;
              let shouldRefetch = true;
              const newQuery = getURLQuery(l);
              const observeParams = getQueryParametersToWatch(this.props);

              if (!!observeParams) {
                shouldRefetch = observeParams.some(
                  key => !deepEqual(newQuery[key], oldQuery[key])
                );
              }

              oldQuery = newQuery;
              if (!!shouldRefetch) this.props.getDataWithCustomLocation(l);
            });
          },
          componentWillUnmount() {
            !!stateListener && stateListener();
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
  extends URLDataSyncOutProps<readonly T[]> {}

/**
 * This HOC automatically manages pagination data sync, and is best used to
 * display table data. For other kinds of data use the data sync HOC.
 */
export function urlCursorPaginatedSyncHOC<T>(
  syncRepository: typeof defaultRepository = defaultRepository,
  overrideConfig: URLDataSyncOutProps<T>["overrideConfiguration"] = {},
  appendURLQuery = defaultAppendURLQuery
): FunctionalEnhancer<
  URLCursorPaginatedSyncInProps<T>,
  URLCursorPaginatedSyncOutProps<T>
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
