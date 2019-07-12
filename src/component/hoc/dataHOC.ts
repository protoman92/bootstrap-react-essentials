import mapProps from "recompose/mapProps";
import withStateHandlers from "recompose/withStateHandlers";
import { mergeQueryMaps } from "../../utils";
import { createEnhancerChain, lifecycle } from "./betterRecompose";

// ############################ AUTO URL DATA SYNC ############################

export interface AutoURLDataSyncInProps<Data> {
  readonly data: Data;
  readonly dataError: Error | null | undefined;
  readonly isLoadingData: boolean;
  readonly urlQuery: URLQueryMap;

  saveData(): void;
  updateData(data: Partial<Data>): void;

  /** Update URL query parameters without reloading and trigger a re-sync. */
  updateURLQuery(...queries: readonly URLQueryMap[]): void;
}

export interface AutoURLDataSyncOutProps<Data> {
  /** This is used for the data synchronizer. */
  readonly additionalDataQuery?: Repository.URLDataSync.AdditionalQuery;
  readonly urlDataSync: Repository.URLDataSync;
  readonly onDataChange?: (data: Data) => void;
}

export interface AutoURLDataSyncEnhancer<Data>
  extends FunctionalEnhancer<
    AutoURLDataSyncInProps<Data>,
    AutoURLDataSyncOutProps<Data>
  > {}

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
export function autoURLDataSync<Data>(
  initial: Data
): AutoURLDataSyncEnhancer<Data> {
  return createEnhancerChain<AutoURLDataSyncOutProps<Data>>()
    .compose(
      withStateHandlers(
        {
          data: initial,
          dataError: undefined as Error | undefined,
          isLoadingData: false,
          urlQuery: {} as URLQueryMap
        },
        {
          setData: (state, { onDataChange }) => data => {
            !!onDataChange && onDataChange(data);
            return { data };
          },
          setDataError: () => dataError => ({ dataError }),
          setIsLoadingData: () => isLoadingData => ({ isLoadingData }),
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

// ############################# MONGO PAGINATION #############################

interface MongoCursorPaginatedData<Data> {
  readonly results: Data;
  readonly count: number;
  readonly next?: string;
  readonly previous?: string;
}

interface MongoCursorPaginationInProps extends MongoCursorPaginationOutProps {
  readonly additionalDataQuery: Repository.URLDataSync.AdditionalQuery;
  readonly page: number;
}

interface MongoCursorPaginationOutProps {
  readonly urlDataSync: Repository.URLDataSync;
}

/**
 * This works with the auto-sync HOC to provide paginated data. It is assumed
 * that the server will return the data in the above format - the cursor markers
 * will be stored internally and fed the next time we perform a GET request.
 */
export function mongoCursorPagination<Data>(): FunctionalEnhancer<
  MongoCursorPaginationInProps,
  MongoCursorPaginationOutProps
> {
  return createEnhancerChain<MongoCursorPaginationOutProps>()
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
        ({
          urlDataSync,
          next,
          previous,
          page,
          setNext,
          setPrevious,
          setPage
        }) => ({
          page,
          additionalDataQuery: { next, previous },
          urlDataSync: {
            ...urlDataSync,
            get: async (
              additionalQuery?: Repository.URLDataSync.AdditionalQuery
            ) => {
              const { results, next: n, previous: p } = await urlDataSync.get<
                MongoCursorPaginatedData<Data>
              >({
                next,
                previous,
                ...additionalQuery
              });

              setNext(n);
              setPrevious(p);

              if (n === previous) {
                setPage(Math.max(0, page - 1));
              } else if (p === next) {
                setPage(page + 1);
              }

              return results;
            }
          }
        })
      )
    ).enhance;
}
