import { mount } from "enzyme";
import React from "react";
import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { asyncTimeout, createTestComponent } from "../../testUtils";
import {
  cursorPagination,
  urlCursorPaginatedDataSync,
  urlDataSync as urlDataSyncHOC,
  URLDataSyncInProps
} from "./dataHOC";

describe("Auto URL data sync", () => {
  interface Data {
    readonly a: number;
    readonly b: number;
    readonly c: number;
  }

  const TestComponent = createTestComponent<URLDataSyncInProps<Data>>();
  const EnhancedComponent = urlDataSyncHOC<Data>()(TestComponent);
  let urlDataSync: Repository.URLDataSync;
  let WrappedElement: JSX.Element;

  beforeEach(() => {
    urlDataSync = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      update: () => Promise.reject(""),
      updateURLQuery: () => Promise.reject(""),
      getURLQuery: () => Promise.reject("")
    });

    WrappedElement = <EnhancedComponent urlDataSync={instance(urlDataSync)} />;
  });

  it("Should perform get correctly", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    const query = { a: "1", b: "2" };
    when(urlDataSync.get(anything())).thenResolve(data);
    when(urlDataSync.getURLQuery()).thenResolve(query);

    // When
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});

    const { data: result, isLoadingData, urlQuery } = wrapper
      .find(TestComponent)
      .props();

    // Then
    verify(urlDataSync.get(undefined)).once();
    verify(urlDataSync.getURLQuery()).once();
    expect(isLoadingData).toBeFalsy();
    expect(result).toEqual(data);
    expect(urlQuery).toEqual(query);
  });

  it("Should perform save correctly", async () => {
    // Setup
    const newData: Data = { a: 1, b: 2, c: 3 };
    when(urlDataSync.update(anything())).thenResolve(newData);
    when(urlDataSync.getURLQuery()).thenResolve({});

    // When
    const wrapper = mount(WrappedElement);
    await asyncTimeout(1);

    wrapper.setProps({});
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
    verify(urlDataSync.update(deepEqual(newData))).once();
    expect(loading2).toBeFalsy();
    expect(result).toEqual(newData);
  });

  it("Should update URL queries correctly", async () => {
    // Setup
    when(urlDataSync.get(anything())).thenResolve({});
    when(urlDataSync.getURLQuery()).thenResolve({});
    when(urlDataSync.updateURLQuery(anything())).thenResolve("changed");
    const query = { a: "1", b: "2" };

    // When
    const wrapper = mount(WrappedElement);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { updateURLQuery } = wrapper.find(TestComponent).props();
    updateURLQuery(query);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { urlQuery } = wrapper.find(TestComponent).props();

    // Then
    verify(urlDataSync.get(undefined)).once();
    verify(urlDataSync.getURLQuery()).once();
    verify(urlDataSync.updateURLQuery(deepEqual(query)));
    expect(urlQuery).toEqual(query);
  });

  it("Should not get data if urlQuery does not change", async () => {
    // Setup
    when(urlDataSync.get(anything())).thenResolve({});
    when(urlDataSync.getURLQuery()).thenResolve({});
    when(urlDataSync.updateURLQuery(anything())).thenResolve("unchanged");

    // When
    const wrapper = mount(WrappedElement);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { updateURLQuery } = wrapper.find(TestComponent).props();
    updateURLQuery({});
    await asyncTimeout(1);

    // Then
    verify(urlDataSync.get(undefined)).never();
    verify(urlDataSync.get(anything())).never();
    verify(urlDataSync.getURLQuery()).once();
    verify(urlDataSync.updateURLQuery(deepEqual({})));
  });

  it("Should set error when getting data fails", async () => {
    // Setup
    const error = new Error("error!");
    when(urlDataSync.get(anything())).thenReject(error);
    when(urlDataSync.getURLQuery()).thenResolve({});

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
    when(urlDataSync.get(anything())).thenResolve({});
    when(urlDataSync.getURLQuery()).thenResolve({});
    when(urlDataSync.update(anything())).thenReject(error);

    // When
    const wrapper = mount(WrappedElement);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { saveData } = wrapper.find(TestComponent).props();
    saveData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { dataError } = wrapper.find(TestComponent).props();

    // Then
    expect(dataError).toEqual(error);
  });
});

describe("Cursor pagination", () => {
  const TestComponent = createTestComponent(cursorPagination);
  const EnhancedComponent = cursorPagination()(TestComponent);
  let WrappedElement: JSX.Element;

  beforeEach(() => {
    WrappedElement = <EnhancedComponent />;
  });

  it("Should set next/previous correctly", async () => {
    // Setup
    const wrapper = mount(WrappedElement);

    // When && Then: Next.
    const { setNext } = wrapper.find(TestComponent).props();
    setNext("next");
    wrapper.setProps({});
    const { next } = wrapper.find(TestComponent).props();
    expect(next).toEqual("next");

    // When && Then: Previous.
    const { setPrevious } = wrapper.find(TestComponent).props();
    setPrevious("previous");
    wrapper.setProps({});
    const { previous } = wrapper.find(TestComponent).props();
    expect(previous).toEqual("previous");
  });
});

describe("URL paginated data sync", () => {
  const TestComponent = createTestComponent(urlCursorPaginatedDataSync);
  const EnhancedComponent = urlCursorPaginatedDataSync()(TestComponent);
  let urlDataSync: Repository.URLDataSync;
  let WrappedElement: JSX.Element;

  beforeEach(() => {
    urlDataSync = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      update: () => Promise.reject(""),
      updateURLQuery: () => Promise.reject(""),
      getURLQuery: () => Promise.reject("")
    });

    WrappedElement = <EnhancedComponent urlDataSync={instance(urlDataSync)} />;
  });

  it("Should go to next page correctly", async () => {
    // Setup
    when(urlDataSync.get(anything())).thenResolve({
      results: [],
      next: "next",
      previous: "previous"
    });

    when(urlDataSync.getURLQuery()).thenResolve({});

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
      urlDataSync.get(deepEqual({ next: undefined, previous: "next" }))
    ).once();
  });

  it("Should go to previous page correctly", async () => {
    // Setup
    when(urlDataSync.get(anything())).thenResolve({
      results: [],
      next: "next",
      previous: "previous"
    });

    when(urlDataSync.getURLQuery()).thenResolve({});

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
      urlDataSync.get(deepEqual({ next: "previous", previous: undefined }))
    ).once();
  });

  it("Should map data to array", async () => {
    // Setup
    const results = [1, 2, 3];
    when(urlDataSync.get(anything())).thenResolve({ results });
    when(urlDataSync.getURLQuery()).thenResolve({});

    // When
    const wrapper = mount(WrappedElement);
    const { getData } = wrapper.find(TestComponent).props();
    getData();
    await asyncTimeout(1);

    wrapper.setProps({});
    const { data } = wrapper.find(TestComponent).props();
    await asyncTimeout(1);

    // Then
    expect(data).toEqual(results);
  });
});
