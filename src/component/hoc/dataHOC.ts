import { withHandlers } from "recompose";
import mapProps from "recompose/mapProps";
import withStateHandlers from "recompose/withStateHandlers";
import { mergeQueryMaps } from "../../utils";
import { createEnhancerChain, lifecycle } from "./betterRecompose";
import { compose } from "recompose";

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

class URLDataSyncFactory<
  Data,
  I extends URLDataSyncInProps<Data> = URLDataSyncInProps<Data>,
  O extends URLDataSyncOutProps<Data> = URLDataSyncOutProps<Data>
> {
  private async callAPI<T>(
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

  getData(props: any, additionalQuery?: URLQueryMap) {
    const { urlDataSync, setData } = props;

    return this.callAPI(
      props,
      () => urlDataSync.get(additionalQuery),
      (data: Data) => {
        this.onDataChanged(props, data);
        setData(data);
      }
    );
  }

  onDataChanged(props: any, data: Data) {}

  newInstance<OutProps>(): FunctionalEnhancer<I & OutProps, O & OutProps> {
    return compose(
      withStateHandlers(
        ({ initialData: data }: any) => ({
          data,
          dataError: undefined as Error | undefined,
          isLoadingData: false,
          urlQuery: {} as URLQueryMap
        }),
        {
          setData: () => data => ({ data }),
          setDataError: () => dataError => ({ dataError }),
          setIsLoadingData: () => isLoadingData => ({ isLoadingData }),
          setURLQuery: () => urlQuery => ({ urlQuery })
        }
      ),
      withHandlers({
        getData: props => () => this.getData(props),
        saveData: (props: any) => () => {
          const { data, urlDataSync, setData } = props;
          this.callAPI(props, () => urlDataSync.update(data), setData);
        },
        updateData: (props: any) => (newData: Partial<Data>) => {
          const { data, setData } = props;
          setData(Object.assign({}, data, newData));
        },
        updateURLQuery: (props: any) => async (
          ...queries: readonly URLQueryMap[]
        ) => {
          const { urlDataSync, setURLQuery } = props;
          setURLQuery(mergeQueryMaps(...queries));
          await urlDataSync.updateURLQuery(...queries);
          await this.getData(props);
        }
      }),
      lifecycle({
        async componentDidMount() {
          const { urlDataSync, setURLQuery } = this.props as any;
          const query = await urlDataSync.getURLQuery();
          setURLQuery(query);
        }
      })
    );
  }
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
export function urlDataSync<Data, OutProps = {}>() {
  return new URLDataSyncFactory<Data>().newInstance<OutProps>();
}

// ############################# DATA PAGINATION #############################

export interface CursorPaginatedData<T> {
  readonly results: readonly T[];
  readonly next?: string;
  readonly previous?: string;
}

export interface CursorPaginationStateInProps<T>
  extends Pick<
    URLDataSyncOutProps<CursorPaginatedData<T>>,
    "additionalDataQuery" | "initialData" | "onDataChange"
  > {
  readonly next?: string;
  readonly previous?: string;
  setNext(next?: string): void;
  setPrevious(previous?: string): void;
}

/**
 * This works with the auto-sync HOC to provide pagination state (but does not
 * trigger the sync). It is assumed that the server will return the data in the
 * above format - the cursor markers will be stored internally and fed the next
 * time we perform a GET request.
 */
export function cursorPaginationState<T, OutProps = {}>(): FunctionalEnhancer<
  CursorPaginationStateInProps<T> & OutProps,
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
        setNext,
        setPrevious,
        onDataChange: ({ next: n, previous: p }: CursorPaginatedData<T>) => {
          setNext(n);
          setPrevious(p);
        }
      }))
    ).enhance as any;
}

export interface CursorPaginationTriggerInProps {
  goToNextPage(): void;
  goToPreviousPage(): void;
}

export interface CursorPaginationTriggerOutProps
  extends Pick<URLDataSyncInProps<any>, "getData">,
    Pick<
      CursorPaginationStateInProps<any>,
      "next" | "previous" | "setNext" | "setPrevious"
    > {}

/** Trigger pagination and re-sync of data. This works with url data sync. */
export function cursorPaginationTrigger<OutProps = {}>(): FunctionalEnhancer<
  CursorPaginationTriggerInProps & OutProps,
  CursorPaginationTriggerOutProps & OutProps
> {
  return createEnhancerChain()
    .forPropsOfType<CursorPaginationTriggerOutProps>()
    .compose(
      withHandlers({
        goToNextPage: ({ next, getData, setNext, setPrevious }) => () => {
          setPrevious(next);
          setNext(undefined);
          getData();
        },
        goToPreviousPage: ({
          previous,
          getData,
          setNext,
          setPrevious
        }) => () => {
          setNext(previous);
          setPrevious(undefined);
          getData();
        }
      })
    ).enhance as any;
}

// ############################## FULL MANAGED ##############################

export interface URLPaginatedDataSyncInProps<T>
  extends URLDataSyncInProps<readonly (T | undefined)[]>,
    Pick<CursorPaginationTriggerInProps, "goToNextPage" | "goToPreviousPage"> {}

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
    .compose(cursorPaginationState())
    .compose(urlDataSync())
    .compose(cursorPaginationTrigger())
    .compose(
      mapProps(({ data: { results: data }, ...rest }) => ({ ...rest, data }))
    ).enhance as any;
}
