import { compose, withProps } from "recompose";
import withStateHandlers from "recompose/withStateHandlers";
import { StrictOmit } from "ts-essentials";
import { lifecycle } from "./betterRecompose";

function or<T>(value1: T | undefined, value2: T) {
  return value1 !== undefined && value1 !== null ? value1 : value2;
}

// ############################ AUTO URL DATA SYNC ############################

export interface URLDataSyncInProps<Data> {
  readonly data: Data | null | undefined;
  readonly dataError: Error | null | undefined;
  readonly isLoadingData: boolean;
  readonly urlQuery: URLQueryMap;

  getData(): void;
  saveData(): void;
  updateData(data: Partial<Data>): void;

  /** Update URL query parameters without reloading and trigger a re-sync. */
  updateURLQuery(query: URLQueryMap): void;
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

  return compose(
    withStateHandlers(
      () => ({
        data: undefined as Data | undefined,
        dataError: undefined as Error | undefined,
        isLoadingData: false,
        urlQuery: {} as URLQueryMap
      }),
      {
        setData: () => data => ({ data }),
        setDataError: () => dataError => ({ dataError }),
        setIsLoadingData: () => isLoadingData => ({
          isLoadingData
        }),
        setURLQuery: () => urlQuery => ({ urlQuery })
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
      updateURLQuery: async (query: URLQueryMap) => {
        const { urlDataSync, setURLQuery } = props;

        (await urlDataSync.updateURLQuery(query)) === "changed" &&
          (await (async () => {
            setURLQuery(query);
            await getData(props);
          })());
      }
    })),
    lifecycle({
      async componentDidMount() {
        const { urlDataSync, setURLQuery } = this.props as any;
        const query = await urlDataSync.getURLQuery();
        setURLQuery(query);
      }
    })
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

export interface CursorPaginationInProps<T> {
  readonly next?: string;
  readonly hasNext?: boolean;
  readonly previous?: string;
  readonly hasPrevious?: string;
  setNext(next?: string): void;
  setHasNext(hasNext?: boolean): void;
  setPrevious(previous?: string): void;
  setHasPrevious(previous?: boolean): void;
}

/**
 * This works with the auto-sync HOC to provide pagination state (but does not
 * trigger the sync). It is assumed that the server will return the data in the
 * above format - the cursor markers will be stored internally and fed the next
 * time we perform a GET request.
 */
export function cursorPagination<T, OutProps = {}>(): FunctionalEnhancer<
  CursorPaginationInProps<T> & OutProps,
  OutProps
> {
  return compose(
    withStateHandlers(
      {
        next: undefined as string | undefined,
        hasNext: undefined as boolean | undefined,
        previous: undefined as string | undefined,
        hasPrevious: undefined as boolean | undefined
      },
      {
        setNext: () => next => ({ next }),
        setHasNext: () => hasNext => ({ hasNext }),
        setPrevious: () => previous => ({ previous }),
        setHasPrevious: () => hasPrevious => ({ hasPrevious })
      }
    )
  );
}

// ############################### FULL MANAGED ###############################

export interface URLCursorPaginatedDataSyncInProps<T>
  extends StrictOmit<URLDataSyncInProps<readonly T[]>, "data">,
    Pick<CursorPaginatedData<T>, "limit" | "order" | "sortField"> {
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
        const { data, urlQuery, updateURLQuery } = props;
        const { next } = or(data, { next: undefined });
        updateURLQuery({ ...urlQuery, next, previous: undefined });
      },
      goToPreviousPage: () => {
        const { data, urlQuery, updateURLQuery } = props;
        const { previous } = or(data, { previous: undefined });
        updateURLQuery({ ...urlQuery, next: undefined, previous });
      }
    })),
    withProps(({ data }: any) => {
      const { results, limit, order, sortField } = or<any>(data, {
        results: []
      });

      return { data: or(results, []), limit, order, sortField };
    })
  );
}
