import { ComponentType, mount } from "enzyme";
import H, { createBrowserHistory } from "history";
import React from "react";
import { BrowserRouter, Router, withRouter } from "react-router-dom";
import { compose } from "recompose";
import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { asyncTimeout, createTestComponent } from "../../testUtils";
import { appendURLQuery as defaultAppendURLQuery } from "../../utils";
import {
  urlCursorPaginatedSyncHOC,
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

  let EnhancedComponent: ComponentType<
    Pick<URLDataSyncOutProps, "queryParametersToWatch" | "syncRepository">
  >;

  let WrappedElement: JSX.Element;
  let history: H.History;
  let repository: Repository.URLDataSync;

  beforeEach(() => {
    history = createBrowserHistory();

    repository = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      update: () => Promise.reject("")
    });

    EnhancedComponent = compose<any, any>(
      withRouter,
      urlDataSyncHOC(instance(repository))
    )(TestComponent);

    WrappedElement = (
      <Router history={history}>
        <EnhancedComponent />
      </Router>
    );
  });

  afterEach(() => {
    history.push("/");
  });

  it("Should perform get correctly", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    when(repository.get(anything(), anything())).thenResolve(data);

    // When
    history.push("/pathname");
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { data: result, isLoadingData } = wrapper.find(TestComponent).props();

    // Then
    verify(repository.get(anything(), deepEqual({ url: "/pathname" }))).once();
    expect(isLoadingData).toBeFalsy();
    expect(result).toEqual(data);
  });

  it("Should perform save correctly", async () => {
    // Setup
    const newData: Data = { a: 1, b: 2, c: 3 };

    when(repository.update(anything(), anything(), anything())).thenResolve(
      newData
    );

    // When
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
    verify(
      repository.update(anything(), deepEqual(newData), deepEqual({}))
    ).once();

    expect(loading2).toBeFalsy();
    expect(result).toEqual(newData);
  });

  it("Should set error when getting data fails", async () => {
    // Setup
    const error = new Error("error!");
    when(repository.get(anything(), anything())).thenReject(error);

    // When
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

    when(repository.update(anything(), anything(), anything())).thenReject(
      error
    );

    // When
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
    const wrapper = mount(WrappedElement);

    // When
    history.push("/path1");
    history.replace("/path2");
    await asyncTimeout(1);
    wrapper.unmount();

    /** After unmount, check if callback is still being executed. */
    history.replace("/path2");
    await asyncTimeout(1);

    // Then
    verify(repository.get(anything(), deepEqual({ url: "/path1" }))).never();
    verify(repository.get(anything(), deepEqual({ url: "/path2" }))).once();
  });

  it("Should only get data if observed query param values change", async () => {
    // Setup
    history.replace("/path1?d=1");

    WrappedElement = (
      <Router history={history}>
        <EnhancedComponent queryParametersToWatch={["a", "b", "c"]} />
      </Router>
    );

    mount(WrappedElement);

    // When
    history.replace("/path1?d=1");
    history.replace("/path2?a=1");
    history.replace("/path2?a=1&b=2");
    history.replace("/path2?a=1&b=2&c=3");
    history.replace("/path2?a=1&b=2&c=3");
    history.replace("/path2?a=1&b=2&c=3");
    history.replace("/path2?a=1&b=2&c=3");
    history.replace("/path2?a=1&b=2&c=3");
    await asyncTimeout(1);

    // Then
    verify(repository.get(anything(), deepEqual({ url: "/path1" }))).never();
    verify(repository.get(anything(), deepEqual({ url: "/path2" }))).times(3);
  });

  it("Should get data every time if observed query params not specified", async () => {
    // Setup
    mount(WrappedElement);

    // When
    history.replace("/path1?d=1");
    history.replace("/path2?a=1");
    history.replace("/path2?a=1");
    history.replace("/path2?a=1");
    await asyncTimeout(1);

    // Then
    verify(repository.get(anything(), deepEqual({ url: "/path1" }))).once();
    verify(repository.get(anything(), deepEqual({ url: "/path2" }))).times(3);
  });

  it("Should not refetch data every time if empty-array query params", async () => {
    // Setup
    WrappedElement = (
      <Router history={history}>
        <EnhancedComponent queryParametersToWatch={[]} />
      </Router>
    );

    mount(WrappedElement);

    // When
    history.replace("/path1?d=1");
    history.replace("/path2?a=1");
    history.replace("/path2?a=1");
    history.replace("/path2?a=1");
    await asyncTimeout(1);

    // Then
    verify(repository.get(anything(), anything())).never();
  });

  it("Should use injected sync repository if possible", async () => {
    // Setup
    const injectedRepository = spy<Repository.URLDataSync>({
      get: () => Promise.resolve({} as any),
      update: () => Promise.reject("")
    });

    // When
    WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent syncRepository={instance(injectedRepository)} />
      </BrowserRouter>
    );

    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    // Then
    verify(injectedRepository.get(anything(), deepEqual({ url: "/" }))).once();
    verify(repository.get(anything())).never();
  });
});

describe("URL paginated data sync", () => {
  const TestComponent = createTestComponent(urlCursorPaginatedSyncHOC);
  let EnhancedComponent: ComponentType<{}>;
  let WrappedElement: JSX.Element;
  let appendURLQuery: typeof defaultAppendURLQuery;
  let urlDataSync: Repository.URLDataSync;

  beforeEach(() => {
    appendURLQuery = jest.fn();

    urlDataSync = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      update: () => Promise.reject("")
    });

    EnhancedComponent = compose<any, any>(
      withRouter,
      urlCursorPaginatedSyncHOC(instance(urlDataSync), {}, appendURLQuery)
    )(TestComponent);

    WrappedElement = (
      <BrowserRouter>
        <EnhancedComponent />
      </BrowserRouter>
    );
  });

  it("Should go to next page correctly", async () => {
    // Setup
    when(urlDataSync.get(anything(), anything())).thenResolve({
      results: [],
      next: "next",
      previous: "previous"
    });

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
    expect(appendURLQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        next: "next",
        previous: undefined
      }
    );
  });

  it("Should go to previous page correctly", async () => {
    // Setup
    when(urlDataSync.get(anything(), anything())).thenResolve({
      results: [],
      next: "next",
      previous: "previous"
    });

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
    expect(appendURLQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        next: undefined,
        previous: "previous"
      }
    );
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
});
