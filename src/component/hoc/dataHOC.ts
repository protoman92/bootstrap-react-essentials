import mapProps from "recompose/mapProps";
import withStateHandlers from "recompose/withStateHandlers";
import { mergeQueryMaps } from "../../utils";
import { createEnhancerChain, lifecycle } from "./betterRecompose";

// ############################ AUTO URL DATA SYNC ############################

export interface URLDataSyncInProps<Data> {
  readonly data: Data;
  readonly dataError: Error | null | undefined;
  readonly isLoadingData: boolean;
  readonly urlQuery: URLQueryMap;

  getData(): void;
  saveData(): void;
  updateData(data: Partial<Data>): void;

  /** Update URL query parameters without reloading and trigger a re-sync. */
  updateURLQuery(...queries: readonly URLQueryMap[]): void;
}

export interface URLDataSyncOutProps<Data> {
  /** This is used for the data synchronizer. */
  readonly additionalDataQuery?: URLQueryMap;
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
          const { urlDataSync, setURLQuery } = this.props;
          const query = await urlDataSync.getURLQuery();
          setURLQuery(query);
        }
      })
    ).enhance as any;
}

// ############################# DATA PAGINATION #############################

export interface CursorPaginatedData<T> {
  readonly results: readonly T[];
  readonly next?: string;
  readonly previous?: string;
}

export interface CursorPaginationInProps<T>
  extends Pick<
    URLDataSyncOutProps<CursorPaginatedData<T>>,
    "additionalDataQuery" | "initialData" | "onDataChange"
  > {}

/**
 * This works with the auto-sync HOC to provide paginated data. It is assumed
 * that the server will return the data in the above format - the cursor markers
 * will be stored internally and fed the next time we perform a GET request.
 */
export function cursorPagination<T, OutProps = {}>(): FunctionalEnhancer<
  CursorPaginationInProps<T> & OutProps,
  OutProps
> {
  return createEnhancerChain()
    .forPropsOfType<OutProps>()
    .compose(
      withStateHandlers(
        {
          next: undefined as string | undefined,
          previous: undefined as string | undefined
        },
        {
          setNext: () => next => ({ next }),
          setPrevious: () => previous => ({ previous })
        }
      )
    )
    .compose(
      mapProps(({ next, previous, setNext, setPrevious, ...rest }) => ({
        ...rest,
        additionalDataQuery: { next, previous },
        initialData: { results: [] } as CursorPaginatedData<T>,
        onDataChange: ({ next: n, previous: p }: CursorPaginatedData<T>) => {
          setNext(n);
          setPrevious(p);
        }
      }))
    ).enhance as any;
}

// ############################## FULL MANAGED ##############################

export interface URLPaginatedDataSyncInProps<T>
  extends URLDataSyncInProps<readonly (T | undefined)[]> {}

export interface URLPaginatedDataSyncOutProps<T>
  extends Pick<URLDataSyncOutProps<CursorPaginatedData<T>>, "urlDataSync"> {}

/**
 * This HOC automatically manages pagination data sync, and is best used to
 * display table data. For other kinds of data use the data sync HOC.
 */
export function urlPaginatedDataSync<T>(): FunctionalEnhancer<
  URLPaginatedDataSyncInProps<T>,
  URLPaginatedDataSyncOutProps<T>
> {
  return createEnhancerChain()
    .forPropsOfType<URLDataSyncOutProps<CursorPaginatedData<T>>>()
    .compose(cursorPagination())
    .compose(urlDataSync())
    .compose(
      mapProps(({ data: { results }, ...rest }) => ({ ...rest, data: results }))
    ).enhance as any;
}
