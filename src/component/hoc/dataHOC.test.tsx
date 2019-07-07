import enzyme from "enzyme";
import React from "react";
import { Provider } from "react-redux";
import { asyncTimeout, createTestComponent, createTestStore } from "testUtils";
import { anything, deepEqual, instance, spy, verify, when } from "ts-mockito";
import { autoURLDataSync, AutoURLDataSyncProps } from "./dataHOC";

describe("Auto URL data sync", () => {
  interface Data {
    readonly a: number;
    readonly b: number;
    readonly c: number;
  }
  const TestComponent = createTestComponent<AutoURLDataSyncProps<Data>>();
  const EnhancedComponent = autoURLDataSync<Data>()(TestComponent);
  let urlDataSync: Repository.URLDataSync;
  let WrappedElement: JSX.Element;

  beforeEach(() => {
    urlDataSync = spy<Repository.URLDataSync>({
      get: () => Promise.reject(""),
      update: () => Promise.reject(""),
      updateURLQuery: () => Promise.reject(""),
      getURLQuery: () => Promise.reject("")
    });

    const testStore = createTestStore(undefined, {
      repository: { urlDataSync: instance(urlDataSync) }
    });

    WrappedElement = (
      <Provider store={testStore}>
        <EnhancedComponent />
      </Provider>
    );
  });

  it("Should perform get automatically", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    const query = { a: "1", b: "2" };
    when(urlDataSync.get()).thenResolve(data);
    when(urlDataSync.getURLQuery()).thenResolve(query);

    // When
    const wrapper = enzyme.mount(WrappedElement);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { data: result, isLoadingData, urlQuery } = wrapper
      .find(TestComponent)
      .props();

    // Then
    verify(urlDataSync.get()).once();
    verify(urlDataSync.getURLQuery()).once();
    expect(isLoadingData).toBeFalsy();
    expect(result).toEqual(data);
    expect(urlQuery).toEqual(query);
  });

  it("Should perform save correctly", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    const newData: Data = { a: 1, b: 2, c: 3 };
    when(urlDataSync.get()).thenResolve(data);
    when(urlDataSync.update(anything())).thenResolve(newData);
    when(urlDataSync.getURLQuery()).thenResolve({});

    // When
    const wrapper = enzyme.mount(WrappedElement);
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
    verify(urlDataSync.get()).once();
    verify(urlDataSync.update(deepEqual(newData))).once();
    expect(loading2).toBeFalsy();
    expect(result).toEqual(newData);
  });

  it("Should update URL queries correctly", async () => {
    // Setup
    when(urlDataSync.get()).thenResolve({});
    when(urlDataSync.getURLQuery()).thenResolve({});
    when(urlDataSync.updateURLQuery(anything())).thenResolve(undefined);
    const query = { a: "1", b: "2" };

    // When
    const wrapper = enzyme.mount(WrappedElement);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { updateURLQuery } = wrapper.find(TestComponent).props();
    updateURLQuery(query);
    await asyncTimeout(1);

    wrapper.setProps({});
    const { urlQuery } = wrapper.find(TestComponent).props();

    // Then
    verify(urlDataSync.get()).twice();
    verify(urlDataSync.getURLQuery()).once();
    verify(urlDataSync.updateURLQuery(deepEqual(query)));
    expect(urlQuery).toEqual(query);
  });
});
