import { compose, withProps } from "recompose";
import withStateHandlers from "recompose/withStateHandlers";
import { StrictOmit } from "ts-essentials";

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
  updateURLQuery(query: URLQueryMap): void;

  /** Instead of setting URL query, append to existing URL query. */
  appendURLQuery(query: URLQueryMap): void;
}

export interface URLDataSyncOutProps<Data> {
  readonly urlDataSync: Repository.URLDataSync;
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
export function urlDataSync<Data, OutProps = {}>(): FunctionalEnhancer<
  URLDataSyncInProps<Data> & OutProps,
  URLDataSyncOutProps<Data> & OutProps
> {
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
    const { urlDataSync, setData } = props;
    return callAPI(props, () => urlDataSync.get(additionalQuery), setData);
  }

  async function updateURLQuery(props: any, query: URLQueryMap) {
    const { urlDataSync } = props;
    await urlDataSync.updateURLQuery(query);
    await getData(props);
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
      getData: () => getData(props),
      saveData: () => {
        const { data, urlDataSync, setData } = props;
        callAPI(props, () => urlDataSync.update(data), setData);
      },
      updateData: (newData: Partial<Data>) => {
        const { data, setData } = props;
        setData(Object.assign({}, data, newData));
      },
      appendURLQuery: async (query: URLQueryMap) => {
        const { urlDataSync } = props;
        const urlQuery = await urlDataSync.getURLQuery();
        updateURLQuery(props, { ...urlQuery, ...query });
      },
      updateURLQuery: (query: URLQueryMap) => updateURLQuery(props, query),
      getURLQuery: () => props.urlDataSync.getURLQuery()
    }))
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

export interface URLCursorPaginatedDataSyncInProps<T>
  extends StrictOmit<URLDataSyncInProps<readonly T[]>, "data">,
    Pick<
      CursorPaginatedData<T>,
      "hasNext" | "hasPrevious" | "limit" | "order" | "sortField"
    > {
  readonly data: readonly T[];
  goToNextPage(): void;
  goToPreviousPage(): void;
}

export interface URLCursorPaginatedDataSyncOutProps<T>
  extends Pick<URLDataSyncOutProps<CursorPaginatedData<T>>, "urlDataSync"> {}

/**
 * This HOC automatically manages pagination data sync, and is best used to
 * display table data. For other kinds of data use the data sync HOC.
 */
export function urlCursorPaginatedDataSync<T>(): FunctionalEnhancer<
  URLCursorPaginatedDataSyncInProps<T>,
  URLCursorPaginatedDataSyncOutProps<T>
> {
  return compose<any, any>(
    urlDataSync(),
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
        any
      >(data, { results: [] });

      return {
        data: or(results, []),
        hasNext,
        hasPrevious,
        limit,
        order,
        sortField
      };
    })
  );
}
