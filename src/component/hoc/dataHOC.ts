import { compose, withHandlers } from "recompose";
import mapProps from "recompose/mapProps";
import withStateHandlers from "recompose/withStateHandlers";
import { lifecycle } from "./betterRecompose";

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
  updateURLQuery(query: URLQueryMap): void;
}

export interface URLDataSyncOutProps<Data> {
  readonly initialData: Data;
  readonly urlDataSync: Repository.URLDataSync;
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
        updateURLQuery: (props: any) => async (query: URLQueryMap) => {
          const { urlDataSync, setURLQuery } = props;

          (await urlDataSync.updateURLQuery(query)) === "changed" &&
            (await (async () => {
              setURLQuery(query);
              await this.getData(props);
            })());
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

// ############################# CURSOR PAGINATION #############################

export interface CursorPaginatedData<T> {
  readonly results: readonly T[];
  readonly next?: string;
  readonly previous?: string;
}

export interface CursorPaginationInProps<T> {
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
export function cursorPagination<T, OutProps = {}>(): FunctionalEnhancer<
  CursorPaginationInProps<T> & OutProps,
  OutProps
> {
  return compose(
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
  );
}

// ############################### FULL MANAGED ###############################

declare namespace URLCursorPaginatedDataSyncFactory {
  export interface InProps<T>
    extends URLDataSyncInProps<CursorPaginatedData<T>> {
    goToNextPage(): void;
    goToPreviousPage(): void;
  }

  export interface OutProps<T>
    extends URLDataSyncOutProps<CursorPaginatedData<T>> {}
}

class URLCursorPaginatedDataSyncFactory<T> extends URLDataSyncFactory<
  CursorPaginatedData<T>,
  URLCursorPaginatedDataSyncFactory.InProps<T>,
  URLCursorPaginatedDataSyncFactory.OutProps<T>
> {
  onDataChanged(props: any, data: CursorPaginatedData<T>) {
    const { setNext, setPrevious } = props;
    const { next, previous } = data;
    setNext(next);
    setPrevious(previous);
    super.onDataChanged(props, data);
  }

  newInstance() {
    return compose<any, any>(
      cursorPagination(),
      super.newInstance(),
      withHandlers({
        goToNextPage: (props: any) => () => {
          const { next } = props;
          this.getData(props, { next: undefined, previous: next });
        },
        goToPreviousPage: (props: any) => () => {
          const { previous } = props;
          this.getData(props, { next: previous, previous: undefined });
        }
      })
    );
  }
}

export interface URLCursorPaginatedDataSyncInProps<T>
  extends URLDataSyncInProps<readonly T[]>,
    Pick<
      URLCursorPaginatedDataSyncFactory.InProps<T>,
      "goToNextPage" | "goToPreviousPage"
    > {}

export interface URLCursorPaginatedDataSyncOutProps<T>
  extends Pick<URLCursorPaginatedDataSyncFactory.OutProps<T>, "urlDataSync"> {}

/**
 * This HOC automatically manages pagination data sync, and is best used to
 * display table data. For other kinds of data use the data sync HOC.
 */
export function urlCursorPaginatedDataSync<T>(): FunctionalEnhancer<
  URLCursorPaginatedDataSyncInProps<T>,
  URLCursorPaginatedDataSyncOutProps<T>
> {
  return compose(
    mapProps(props => ({
      initialData: { results: [] } as CursorPaginatedData<T>,
      ...props
    })),
    new URLCursorPaginatedDataSyncFactory().newInstance(),
    mapProps(({ data: { results: data }, ...rest }: any) => ({
      ...rest,
      data
    }))
  );
}
