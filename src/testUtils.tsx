import React, { ComponentType } from "react";
import { createStore, Dispatch, Store } from "redux";
import { DeepPartial } from "ts-essentials";

type SideEffectDispatch = (...args: Parameters<Dispatch>) => void;

export function asyncTimeout<T extends any[]>(
  ms: number,
  ...args: T
): Promise<T> {
  return new Promise(resolve => {
    setTimeout(resolve, ms, ...args);
  });
}

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

export function createTestComponent<Props>(): ComponentType<Props> {
  return props => {
    // console.info("Props for test component:\n", props);
    return <div />;
  };
}
