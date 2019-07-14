import { mount } from "enzyme";
import React from "react";
import { mapProps } from "recompose";
import { createTestComponent } from "../../testUtils";
import {
  createEnhancerChain,
  lifecycle,
  onlyUpdateForKeys,
  withState
} from "./betterRecompose";

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
      .startWith(withState("a", "setA", 0))
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

    const InfusedComponent = enhancer.infuseWithProps(TestComponent);
    const EnhancedComponent = enhancer.enhance(TestComponent);
    const WrappedElement = mount(<EnhancedComponent />);

    // When
    <InfusedComponent a={1} b={1} c={1} />;
    const { a, b, c } = WrappedElement.find(TestComponent).props();

    // Then
    expect(a).toEqual(1);
    expect(b).toEqual(1);
    expect(c).toEqual(1);
  });
});
