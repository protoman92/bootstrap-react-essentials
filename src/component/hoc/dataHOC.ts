import mapProps from "recompose/mapProps";
import withStateHandlers from "recompose/withStateHandlers";
import { createSparseArray, mergeQueryMaps } from "../../utils";
import { createEnhancerChain, lifecycle } from "./betterRecompose";

// ############################ AUTO URL DATA SYNC ############################

export interface URLDataSyncInProps<Data> {
  readonly data: Data;
  readonly dataError: Error | null | undefined;
  readonly isLoadingData: boolean;
  readonly urlQuery: URLQueryMap;

  saveData(): void;
  updateData(data: Partial<Data>): void;

  /** Update URL query parameters without reloading and trigger a re-sync. */
  updateURLQuery(...queries: readonly URLQueryMap[]): void;
}

export interface URLDataSyncOutProps<Data> {
  /** This is used for the data synchronizer. */
  readonly additionalDataQuery?: Repository.URLDataSync.AdditionalQuery;
  readonly initialData: Data;
  readonly urlDataSync: Repository.URLDataSync;
  readonly onDataChange?: (data: Data) => void;
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
  return createEnhancerChain()
    .forPropsOfType<URLDataSyncOutProps<Data> & OutProps>()
    .compose(
      withStateHandlers(
        ({ initialData: data }) => ({
          data,
          dataError: undefined as Error | undefined,
          isLoadingData: false,
          urlQuery: {} as URLQueryMap
        }),
        {
          setData: (state, { onDataChange }) => data => {
            !!onDataChange && onDataChange(data);
            return { data };
          },
          setDataError: () => dataError => ({ dataError }),
          setIsLoadingData: () => isLoadingData => ({
            isLoadingData
          }),
          setURLQuery: () => urlQuery => ({ urlQuery })
        }
      )
    )
    .compose(
      mapProps(
        ({
          additionalDataQuery,
          urlDataSync,
          data,
          setData,
          setDataError,
          setIsLoadingData,
          setURLQuery,
          ...rest
        }) => {
          async function callAPI<T>(
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

          const getData = () =>
            callAPI(() => urlDataSync.get(additionalDataQuery), setData);

          return {
            ...rest,
            data,
            getData,
            setURLQuery,
            urlDataSync,
            saveData: () => callAPI(() => urlDataSync.update(data), setData),
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

// ############################# DATA PAGINATION #############################

export interface CursorPaginatedData<Data> {
  readonly results: Data;
  readonly count: number;
  readonly limit: number;
  readonly next?: string;
  readonly previous?: string;
}

export interface CursorPaginationInProps<Data>
  extends Pick<
    URLDataSyncOutProps<CursorPaginatedData<Data>>,
    "additionalDataQuery" | "onDataChange"
  > {
  readonly page: number;
}

/**
 * This works with the auto-sync HOC to provide paginated data. It is assumed
 * that the server will return the data in the above format - the cursor markers
 * will be stored internally and fed the next time we perform a GET request.
 */
export function cursorPagination<Data, OutProps = {}>(): FunctionalEnhancer<
  CursorPaginationInProps<Data> & OutProps,
  OutProps
> {
  return createEnhancerChain()
    .forPropsOfType<OutProps>()
    .compose(
      withStateHandlers(
        {
          next: "",
          previous: "",
          page: 0
        },
        {
          setNext: () => next => ({ next }),
          setPrevious: () => previous => ({ previous }),
          setPage: () => page => ({ page })
        }
      )
    )
    .compose(
      mapProps(
        ({ next, previous, page, setNext, setPrevious, setPage, ...rest }) => ({
          ...rest,
          additionalDataQuery: { next, previous },
          page,
          onDataChange: ({
            next: n,
            previous: p
          }: CursorPaginatedData<Data>) => {
            setNext(n);
            setPrevious(p);

            if (n === previous) {
              setPage(Math.max(0, page - 1));
            } else if (p === next) {
              setPage(page + 1);
            }
          }
        })
      )
    ).enhance;
}

export interface CursorPaginationDataInProps<T>
  extends Pick<URLDataSyncInProps<readonly (T | undefined)[]>, "data">,
    Pick<CursorPaginationInProps<any>, "page"> {}

export interface CursorPaginationDataOutProps<T>
  extends Pick<URLDataSyncInProps<CursorPaginatedData<readonly T[]>>, "data">,
    Pick<CursorPaginationInProps<any>, "page"> {}

/**
 * This works with the cursor pagination HOC and auto URL data sync to provide
 * a sparsely-populated data array based on the current page. For example, a
 * page of 5 items and total item count of 10 looks like so (x is a valid item,
 * o is undefined):
 * - Page 1: [x, x, x, x, x, o, o, o, o, o].
 * - Page 2: [o, o, o, o, o, x, x, x, x, x].
 */
export function cursorPaginationData<T, OutProps = {}>(): FunctionalEnhancer<
  CursorPaginationDataInProps<T> & OutProps,
  CursorPaginationDataOutProps<T> & OutProps
> {
  return createEnhancerChain()
    .forPropsOfType<CursorPaginationDataOutProps<T> & OutProps>()
    .compose(
      mapProps(({ data: { results, count, limit }, page, ...rest }) => ({
        ...rest,
        data: createSparseArray(count, limit * page, ...results),
        page
      }))
    ).enhance;
}
