import { mount } from "enzyme";
import React from "react";
import { mapProps } from "recompose";
import { createTestComponent } from "../../testUtils";
import {
  createEnhancerChain,
  lifecycle,
  omitKeys,
  onlyUpdateForKeys,
  withState
} from "./betterRecompose";
import { autoURLDataSync, cursorPagination } from "./dataHOC";

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
      .compose(withState("a", "setA", 0))
      .compose(withState("b", "setB", 0))
      .compose(mapProps(({ a, b }) => ({ a: a + 1, b: b + 1 })))
      .compose(withState("c", "setC", 0))
      .checkThis((i, o) => {})
      .compose(
        lifecycle({
          componentDidMount() {
            this.props.setC(1);
          }
        })
      )
      .compose(onlyUpdateForKeys("a", "b", "c"))
      .compose(omitKeys("setC"))
      .compose(withState("d", "setD", 1))
      .forOutPropsOfType<EndProps>()
      .omitKeysForOutProps("a", "b", "c")
      .forOutPropsOfType<{}>();

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
    // Setup
    createEnhancerChain()
      .compose(cursorPagination<{}>())
      .compose(autoURLDataSync())
      .checkThis((i, o) => i.data.results);
  });
});
