import { mount } from "enzyme";
import React from "react";
import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { asyncTimeout, createTestComponent } from "../../testUtils";
import {
  CursorPaginatedData,
  cursorPagination,
  urlDataSync as urlDataSyncHOC,
  URLDataSyncInProps
} from "./dataHOC";

describe("Auto URL data sync", () => {
  interface Data {
    readonly a: number;
    readonly b: number;
    readonly c: number;
  }

  const initial: Data = { a: 0, b: 0, c: 0 };
  const additionalDataQuery = { a: 1, b: 2, c: 3 };
  const TestComponent = createTestComponent<URLDataSyncInProps<Data>>();
  const EnhancedComponent = urlDataSyncHOC<Data>()(TestComponent);
  let urlDataSync: Repository.URLDataSync;
  let WrappedElement: JSX.Element;
  let onDataChange: (data: Data) => void;

  beforeEach(() => {
    onDataChange = jest.fn();

    urlDataSync = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      update: () => Promise.reject(""),
      updateURLQuery: () => Promise.reject(""),
      getURLQuery: () => Promise.reject("")
    });

    WrappedElement = (
      <EnhancedComponent
        additionalDataQuery={additionalDataQuery}
        initialData={initial}
        onDataChange={onDataChange}
        urlDataSync={instance(urlDataSync)}
      />
    );
  });

  it("Should perform get automatically", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    const query = { a: "1", b: "2" };
    when(urlDataSync.get(anything())).thenResolve(data);
    when(urlDataSync.getURLQuery()).thenResolve(query);

    // When
    const wrapper = mount(WrappedElement);
    await asyncTimeout(1);

    wrapper.setProps({});

    const { data: result, isLoadingData, urlQuery } = wrapper
      .find(TestComponent)
      .props();

    // Then
    verify(urlDataSync.get(deepEqual(additionalDataQuery))).once();
    verify(urlDataSync.getURLQuery()).once();
    expect(onDataChange).toHaveBeenCalledTimes(1);
    expect(isLoadingData).toBeFalsy();
    expect(result).toEqual(data);
    expect(urlQuery).toEqual(query);
  });

  it("Should perform save correctly", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    const newData: Data = { a: 1, b: 2, c: 3 };
    when(urlDataSync.get(anything())).thenResolve(data);
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
    verify(urlDataSync.get(deepEqual(additionalDataQuery))).once();
    verify(urlDataSync.update(deepEqual(newData))).once();
    expect(loading2).toBeFalsy();
    expect(result).toEqual(newData);
  });

  it("Should update URL queries correctly", async () => {
    // Setup
    when(urlDataSync.get(anything())).thenResolve({});
    when(urlDataSync.getURLQuery()).thenResolve({});
    when(urlDataSync.updateURLQuery(anything())).thenResolve(undefined);
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
    verify(urlDataSync.get(deepEqual(additionalDataQuery))).twice();
    verify(urlDataSync.getURLQuery()).once();
    verify(urlDataSync.updateURLQuery(deepEqual(query)));
    expect(urlQuery).toEqual(query);
  });

  it("Should set error when getting data fails", async () => {
    // Setup
    const error = new Error("error!");
    when(urlDataSync.get(anything())).thenReject(error);
    when(urlDataSync.getURLQuery()).thenResolve({});

    // When
    const wrapper = mount(WrappedElement);
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

  it("Should set next correctly", async () => {
    // Setup
    function createData(
      next: string,
      previous: string
    ): CursorPaginatedData<{}> {
      return { results: [], next, previous };
    }

    const wrapper = mount(WrappedElement);

    // When && Then: Base case.
    const { onDataChange: onChange1 } = wrapper.find(TestComponent).props();
    onChange1!(createData("next1", "prev1"));
    wrapper.setProps({});

    const { additionalDataQuery: query1 } = wrapper.find(TestComponent).props();
    expect(query1).toEqual({ next: "next1", previous: "prev1" });

    // When && Then: Next page.
    const { onDataChange: onChange2 } = wrapper.find(TestComponent).props();
    onChange2!(createData("next2", "next1"));
    wrapper.setProps({});

    const { additionalDataQuery: query2 } = wrapper.find(TestComponent).props();
    expect(query2).toEqual({ next: "next2", previous: "next1" });

    // When && Then: Previous page.
    const { onDataChange: onChange3 } = wrapper.find(TestComponent).props();
    onChange3!(createData("next1", "prev1"));
    wrapper.setProps({});

    const { additionalDataQuery: query3 } = wrapper.find(TestComponent).props();
    expect(query3).toEqual({ next: "next1", previous: "prev1" });

    // When && Then: Previous page without changing page.
    const { onDataChange: onChange4 } = wrapper.find(TestComponent).props();
    onChange4!(createData("prev1", "prev2"));
    wrapper.setProps({});

    const { additionalDataQuery: query4 } = wrapper.find(TestComponent).props();
    expect(query4).toEqual({ next: "prev1", previous: "prev2" });
  });
});
