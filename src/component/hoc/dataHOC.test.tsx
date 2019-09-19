import { ComponentType, mount } from "enzyme";
import H from "history";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import {
  anything,
  capture,
  deepEqual,
  instance,
  spy,
  verify,
  when
} from "ts-mockito";
import {
  asyncTimeout,
  constructObject,
  createTestComponent
} from "../../testUtils";
import {
  urlCursorPaginatedSyncHOC,
  URLCursorPaginatedSyncOutProps,
  urlDataSyncHOC,
  URLDataSyncInProps,
  URLDataSyncOutProps
} from "./dataHOC";

describe("Auto URL data sync", () => {
  interface Data {
    readonly a: number;
    readonly b: number;
    readonly c: number;
  }

  const TestComponent = createTestComponent<URLDataSyncInProps<Data>>();
  let EnhancedComponent: ComponentType<URLDataSyncOutProps>;
  let repository: Repository.URLDataSync;

  beforeEach(() => {
    repository = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      getURLQuery: () => ({}),
      onURLStateChange: () => ({} as any),
      replaceURLQuery: () => {},
      update: () => Promise.reject("")
    });

    EnhancedComponent = urlDataSyncHOC<Data>(instance(repository))(
      TestComponent
    );
  });

  it("Should perform get correctly", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    when(repository.get(anything(), anything())).thenResolve(data);

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { data: result, isLoadingData } = wrapper.find(TestComponent).props();

    // Then
    verify(repository.get(anything(), deepEqual({ params: undefined }))).once();
    expect(isLoadingData).toBeFalsy();
    expect(result).toEqual(data);
  });

  it("Should perform save correctly", async () => {
    // Setup
    const newData: Data = { a: 1, b: 2, c: 3 };
    when(repository.update(anything(), anything())).thenResolve(newData);

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { updateData } = wrapper.find(TestComponent).props();
    updateData(newData);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { saveData } = wrapper.find(TestComponent).props();
    saveData();

    wrapper.setProps({});
    const { isLoadingData: loading1 } = wrapper.find(TestComponent).props();
    expect(loading1).toBeTruthy();
    await asyncTimeout(1);

    wrapper.setProps({});

    const { data: result, isLoadingData: loading2 } = wrapper
      .find(TestComponent)
      .props();

    await asyncTimeout(1);

    // Then
    verify(repository.update(deepEqual(newData), deepEqual({}))).once();
    expect(loading2).toBeFalsy();
    expect(result).toEqual(newData);
  });

  it("Should update URL queries correctly", async () => {
    // Setup
    when(repository.get(anything())).thenResolve({});
    when(repository.replaceURLQuery(anything(), anything())).thenResolve();
    const query = { a: "1", b: "2" };

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { replaceURLQuery } = wrapper.find(TestComponent).props();
    replaceURLQuery(query);
    await asyncTimeout(1);

    // Then
    verify(repository.get(anything())).never();
    verify(repository.replaceURLQuery(anything(), deepEqual(query)));
  });

  it("Should append URL queries correctly", async () => {
    // Setup
    const oldQuery = { a: "1", b: "2", c: "3" };
    const newQuery = { a: "2", b: "3" };
    when(repository.get(anything())).thenResolve({});
    when(repository.getURLQuery(anything())).thenReturn(oldQuery);
    when(repository.replaceURLQuery(anything(), anything())).thenResolve();

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { appendURLQuery } = wrapper.find(TestComponent).props();
    appendURLQuery(newQuery);
    await asyncTimeout(1);

    // Then
    verify(repository.get(anything())).never();

    verify(
      repository.replaceURLQuery(
        anything(),
        deepEqual({ ...oldQuery, ...newQuery })
      )
    ).once();
  });

  it("Should set error when getting data fails", async () => {
    // Setup
    const error = new Error("error!");
    when(repository.get(anything(), anything())).thenReject(error);

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    await getData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { dataError } = wrapper.find(TestComponent).props();

    // Then
    expect(dataError).toEqual(error);
  });

  it("Should set error when saving fails", async () => {
    // Setup
    const error = new Error("error!");
    when(repository.get(anything(), anything())).thenResolve({});
    when(repository.update(anything(), anything())).thenReject(error);

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { saveData } = wrapper.find(TestComponent).props();
    saveData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { dataError } = wrapper.find(TestComponent).props();

    // Then
    expect(dataError).toEqual(error);
  });

  it("Should get data on URL state changes", async () => {
    // Setup
    const subscription = spy<Subscription>({ unsubscribe: () => {} });

    when(repository.onURLStateChange(anything(), anything())).thenReturn(
      instance(subscription)
    );

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const [, callbackFn] = capture(repository.onURLStateChange).first();
    callbackFn(constructObject<H.Location>({}), "REPLACE");
    callbackFn(constructObject<H.Location>({}), "PUSH");
    callbackFn(constructObject<H.Location>({}), "POP");
    await asyncTimeout(1);
    wrapper.unmount();

    // Then
    verify(repository.get(anything(), deepEqual({ params: undefined }))).once();
    verify(subscription.unsubscribe()).once();
  });

  it("Should use injected sync repository if possible", async () => {
    // Setup
    const injectedRepository = spy<Repository.URLDataSync>({
      get: () => Promise.resolve({} as any),
      getURLQuery: () => ({}),
      onURLStateChange: () => ({} as any),
      replaceURLQuery: () => {},
      update: () => Promise.reject("")
    });

    // When
    const WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent syncRepository={instance(injectedRepository)} />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    // Then
    verify(
      injectedRepository.get(anything(), deepEqual({ params: undefined }))
    ).once();

    verify(repository.get(anything())).never();
  });
});

describe("URL paginated data sync", () => {
  const TestComponent = createTestComponent(urlCursorPaginatedSyncHOC);
  let EnhancedComponent: ComponentType<URLCursorPaginatedSyncOutProps>;
  let urlDataSync: Repository.URLDataSync;
  let WrappedElement: JSX.Element;

  beforeEach(() => {
    urlDataSync = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      getURLQuery: () => ({}),
      onURLStateChange: () => ({} as any),
      replaceURLQuery: () => {},
      update: () => Promise.reject("")
    });

    EnhancedComponent = urlCursorPaginatedSyncHOC(instance(urlDataSync))(
      TestComponent
    );

    WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );
  });

  it("Should go to next page correctly", async () => {
    // Setup
    const urlQuery = { a: "1", b: "2", c: "3" };

    when(urlDataSync.get(anything(), anything())).thenResolve({
      results: [],
      next: "next",
      previous: "previous"
    });

    when(urlDataSync.getURLQuery(anything())).thenReturn(urlQuery);
    when(urlDataSync.replaceURLQuery(anything(), anything())).thenResolve();

    // When
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { goToNextPage } = wrapper.find(TestComponent).props();
    goToNextPage();
    await asyncTimeout(1);

    // Then
    verify(
      urlDataSync.replaceURLQuery(
        anything(),
        deepEqual({ ...urlQuery, next: "next", previous: undefined })
      )
    ).once();
  });

  it("Should go to previous page correctly", async () => {
    // Setup
    const urlQuery = { a: "1", b: "2", c: "3" };

    when(urlDataSync.get(anything(), anything())).thenResolve({
      results: [],
      next: "next",
      previous: "previous"
    });

    when(urlDataSync.getURLQuery(anything())).thenReturn(urlQuery);
    when(urlDataSync.replaceURLQuery(anything(), anything())).thenResolve();

    // When
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { goToPreviousPage } = wrapper.find(TestComponent).props();
    goToPreviousPage();
    await asyncTimeout(1);

    // Then
    verify(
      urlDataSync.replaceURLQuery(
        anything(),
        deepEqual({ ...urlQuery, next: undefined, previous: "previous" })
      )
    ).once();
  });

  it("Should map data to array", async () => {
    // Setup
    const results = [1, 2, 3];
    const hasNext = true;
    const hasPrevious = true;
    const limit = 1000;
    const order = "ascend";
    const sortField = "abc";

    when(urlDataSync.get(anything(), anything())).thenResolve({
      hasNext,
      hasPrevious,
      limit,
      order,
      results,
      sortField
    });

    when(urlDataSync.getURLQuery(anything())).thenReturn({});

    // When
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});

    const {
      data,
      hasNext: resultHasNext,
      hasPrevious: resultHasPrevious,
      limit: resultLimit,
      order: resultOrder,
      sortField: resultSortField
    } = wrapper.find(TestComponent).props();

    // Then
    expect(data).toEqual(results);
    expect(resultHasNext).toEqual(hasNext);
    expect(resultHasPrevious).toEqual(hasPrevious);
    expect(resultLimit).toEqual(limit);
    expect(resultOrder).toEqual(order);
    expect(resultSortField).toEqual(sortField);
  });

  it("Should give default result array if data is falsy", async () => {
    // Setup
    when(urlDataSync.get(anything())).thenResolve(null);
    when(urlDataSync.getURLQuery(anything())).thenReturn({});

    // When
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});

    const {
      data,
      hasNext,
      hasPrevious,
      limit,
      order,
      sortField
    } = wrapper.find(TestComponent).props();

    // Then
    expect(data).toEqual([]);
    expect(hasNext).toEqual(undefined);
    expect(hasPrevious).toEqual(undefined);
    expect(limit).toEqual(undefined);
    expect(order).toEqual(undefined);
    expect(sortField).toEqual(undefined);
  });

  it("Should give default result array if results are falsy", async () => {
    // Setup
    when(urlDataSync.get(anything())).thenResolve({ results: null });
    when(urlDataSync.getURLQuery(anything())).thenReturn({});

    // When
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { data } = wrapper.find(TestComponent).props();

    // Then
    expect(data).toEqual([]);
  });

  it("Should get url query correctly", async () => {
    // Setup
    const query = { a: "1", b: "2" };
    when(urlDataSync.getURLQuery(anything())).thenReturn(query);

    // When
    const wrapper = mount(WrappedElement);
    const { getURLQuery } = wrapper.find(TestComponent).props();
    const resultURLQuery = getURLQuery();

    // Then
    expect(resultURLQuery).toEqual(query);
  });
});
