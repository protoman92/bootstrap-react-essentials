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
    when(urlDataSync.get()).thenResolve(data);

    // When
    const wrapper = enzyme.mount(WrappedElement);
    const { isLoadingData: loading1 } = wrapper.find(TestComponent).props();
    expect(loading1).toBeTruthy();

    await asyncTimeout(1);
    wrapper.setProps({});

    const { data: propData, isLoadingData: loading2 } = wrapper
      .find(TestComponent)
      .props();

    // Then
    verify(urlDataSync.get()).once();
    expect(loading2).toBeFalsy();
    expect(propData).toEqual(data);
  });

  it("Should perform save correctly", async () => {
    // Setup
    const data: Data = { a: 0, b: 1, c: 2 };
    const newData: Data = { a: 1, b: 2, c: 3 };
    when(urlDataSync.get()).thenResolve(data);
    when(urlDataSync.update(anything())).thenResolve(newData);

    // When
    const wrapper = enzyme.mount(WrappedElement);
    await asyncTimeout(1);
    wrapper.setProps({});
    const { updateData } = wrapper.find(TestComponent).props();
    updateData(newData);

    wrapper.setProps({});
    const { saveData } = wrapper.find(TestComponent).props();
    saveData();
    wrapper.setProps({});
    const { isLoadingData: loading1 } = wrapper.find(TestComponent).props();
    expect(loading1).toBeTruthy();
    await asyncTimeout(1);

    wrapper.setProps({});

    const { data: propData, isLoadingData: loading2 } = wrapper
      .find(TestComponent)
      .props();

    await asyncTimeout(1);

    // Then
    verify(urlDataSync.get()).once();
    verify(urlDataSync.update(deepEqual(newData))).once();
    expect(loading2).toBeFalsy();
    expect(propData).toEqual(newData);
  });

  it("Should update URL queries correctly", async () => {
    // Setup
    when(urlDataSync.get()).thenResolve({});
    when(urlDataSync.updateURLQuery(anything())).thenResolve(undefined);
    const query = { a: "1", b: "2" };

    // When
    const wrapper = enzyme.mount(WrappedElement);
    const { updateURLQuery } = wrapper.find(TestComponent).props();
    updateURLQuery(query);
    await asyncTimeout(1);

    // Then
    verify(urlDataSync.updateURLQuery(deepEqual(query)));
    verify(urlDataSync.get()).twice();
  });

  it("Should get URL query correctly", async () => {
    // Setup
    const query = { a: "1", b: "2" };
    when(urlDataSync.get()).thenResolve({});
    when(urlDataSync.getURLQuery()).thenResolve(query);

    // When
    const wrapper = enzyme.mount(WrappedElement);
    const { getURLQuery } = wrapper.find(TestComponent).props();
    const result = await getURLQuery();

    // Then
    expect(result).toEqual(query);
  });
});
