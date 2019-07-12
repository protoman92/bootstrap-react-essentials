import React, { ComponentType } from "react";
import { createStore, Dispatch, Store } from "redux";
import { DeepPartial } from "ts-essentials";

type SideEffectDispatch = (...args: Parameters<Dispatch>) => void;

/* istanbul ignore next */
export function asyncTimeout<T extends any[]>(
  ms: number,
  ...args: T
): Promise<T> {
  return new Promise(resolve => {
    setTimeout(resolve, ms, ...args);
  });
}

/* istanbul ignore next */
/** Create a test store that overrides some properties from the base store. */
export function createTestStore(
  dispatch?: SideEffectDispatch,
  initialState?: DeepPartial<ReduxState>
): Store<ReduxState> {
  const store = createStore(state => state as ReduxState, initialState);

  return {
    ...store,
    dispatch: !!dispatch
      ? a => {
          dispatch(a);
          return a;
        }
      : store.dispatch
  } as Store<ReduxState>;
}

/* istanbul ignore next */
export function createTestComponent<Props>(
  enhance?:
    | FunctionalEnhancer<Props, any>
    | ((...args: any) => FunctionalEnhancer<Props, any>)
): ComponentType<Props> {
  return props => {
    // console.info("Props for test component:\n", props);
    return <div />;
  };
}
