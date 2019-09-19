import { ComponentType, mount } from "enzyme";
import H, { createBrowserHistory } from "history";
import React from "react";
import { BrowserRouter, Router, withRouter } from "react-router-dom";
import { compose } from "recompose";
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
    Pick<URLDataSyncOutProps, "syncRepository">
  >;

  let WrappedElement: JSX.Element;
  let history: H.History;
  let repository: Repository.URLDataSync;

  beforeEach(() => {
    history = createBrowserHistory();

    repository = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      onURLStateChange: () => ({} as any),
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

    when(repository.update(anything(), anything(), anything())).thenReject(
      error
    );

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
    verify(repository.get(anything(), deepEqual({ url: "/" }))).once();
    verify(subscription.unsubscribe()).once();
  });

  it("Should use injected sync repository if possible", async () => {
    // Setup
    const injectedRepository = spy<Repository.URLDataSync>({
      get: () => Promise.resolve({} as any),
      onURLStateChange: () => ({} as any),
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
      onURLStateChange: () => ({} as any),
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
