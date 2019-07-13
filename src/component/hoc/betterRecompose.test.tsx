import { mount } from "enzyme";
import React from "react";
import { mapProps } from "recompose";
import { createTestComponent } from "../../testUtils";
import {
  createEnhancerChain,
  lifecycle,
  withState,
  onlyUpdateForKeys
} from "./betterRecompose";
import { urlPaginatedDataSync } from "./dataHOC";

describe("Enhancer chain", () => {
  it("Should work correctly", async () => {
    // Setup
    interface StartProps {
      readonly a: number;
      readonly b: number;
    }

    interface EndProps extends StartProps {
      readonly c: number;
    }

    const TestComponent = createTestComponent<EndProps>();

    const enhancer = createEnhancerChain()
      .forPropsOfType<{}>()
      .compose(withState("a", "setA", 0))
      .compose(withState("b", "setB", 0))
      .compose(mapProps(({ a, b }) => ({ a: a + 1, b: b + 1 })))
      .compose(withState("c", "setC", 0))
      .compose(withState("d", "setD", 0))
      .checkThis((i, o) => {})
      .compose(
        lifecycle({
          componentDidMount() {
            this.props.setC(1);
          }
        })
      )
      .compose(onlyUpdateForKeys("a", "b", "c"))
      .compose(withState("d", "setD", 1))
      .keepKeysForInProps("a", "b", "c", "d")
      .omitKeysFromInProps("d")
      .forPropsOfType<EndProps>()
      .omitKeysFromOutProps("a", "b")
      .keepKeysForOutProps("c")
      .omitKeysFromOutProps("c")
      .forPropsOfType<EndProps & { d: number }>()
      .omitKeysFromInProps("d")
      .omitKeysFromOutProps("a", "b", "c", "d");

    const EnhancedComponent = enhancer.enhance(TestComponent);
    const WrappedElement = mount(<EnhancedComponent />);

    // When
    const { a, b, c } = WrappedElement.find(TestComponent).props();

    // Then
    expect(a).toEqual(1);
    expect(b).toEqual(1);
    expect(c).toEqual(1);
  });

  it("Mongo pagination and auto URL data sync", async () => {
    const enhancer = createEnhancerChain().startWith(
      urlPaginatedDataSync<number>()
    );

    const TestComponent = enhancer.infuseWithProps(() => <div />);
    const EnhancedComponent = enhancer.enhance(TestComponent);
    <EnhancedComponent urlDataSync={undefined as any} />;

    <TestComponent
      data={[]}
      dataError={null}
      isLoadingData={false}
      urlQuery={{}}
      saveData={() => {}}
      updateData={() => {}}
      updateURLQuery={() => {}}
      goToNextPage={() => {}}
      goToPreviousPage={() => {}}
    />;
  });
});
