import { ComponentType } from "react";
import { InferableComponentEnhancerWithProps as ICEW1 } from "react-redux";
import { InferableComponentEnhancerWithProps as ICEW2 } from "recompose";
import compose from "recompose/compose";
import baseLifecyle from "recompose/lifecycle";
import baseMapProps from "recompose/mapProps";
import baseOnlyUpdateForKeys from "recompose/onlyUpdateForKeys";
import baseWithState from "recompose/withState";

type Enhancer<I, O> = import("recompose").ComponentEnhancer<I, O>;
type LifecycleF<P, S, I> = import("recompose").ReactLifeCycleFunctions<P, S, I>;

declare module "recompose" {
  export interface ReactLifeCycleFunctions<TProps, TState, TInstance = {}> {
    componentWillMount?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>
    ) => void;

    componentDidMount?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>
    ) => void;

    componentWillReceiveProps?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>,
      nextProps: TProps
    ) => void;

    shouldComponentUpdate?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>,
      nextProps: TProps,
      nextState: TState
    ) => boolean;

    componentWillUpdate?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>,
      nextProps: TProps,
      nextState: TState
    ) => void;

    componentDidUpdate?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>,
      prevProps: TProps,
      prevState: TState
    ) => void;

    componentWillUnmount?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>
    ) => void;
    componentDidCatch?: (
      this: ReactLifeCycleFunctionsThisArguments<TProps, TState, TInstance>,
      error: Error,
      info: React.ErrorInfo
    ) => void;
  }
}

/**
 * An enhancer chain allows for type-safe HOC composition. Instead of using
 * compose, use this chain to ensure type-safeness for the final component.
 */
interface EnhancerChain<I, O> {
  compose<I1>(e: Enhancer<I1, I>): EnhancerChain<I1, O>;
  compose<I1>(e: FunctionalEnhancer<I1, I>): EnhancerChain<I1, O>;
  compose<I1>(e: ICEW1<I1, I>): EnhancerChain<I1, O>;
  compose<I1>(e: ICEW2<I1, I>): EnhancerChain<I1, O>;
  checkThis(fn?: (i: I, o: O) => void): EnhancerChain<I, O>;
  enhance(c: ComponentType<I>): ComponentType<O>;
  forPropsOfType<P>(props?: P): EnhancerChain<P, P>;
  omitKeysFromInProps<K extends keyof I>(
    ...keys: readonly K[]
  ): EnhancerChain<OmitKeys<I, K>, O>;
  omitKeysFromOutProps<K extends keyof O>(
    ...keys: K[]
  ): EnhancerChain<I, OmitKeys<O, K>>;
  keepKeysForInProps<K extends keyof I>(
    ...keys: K[]
  ): EnhancerChain<Pick<I, K>, O>;
  keepKeysForOutProps<K extends keyof O>(
    ...keys: K[]
  ): EnhancerChain<I, Pick<O, K>>;
}

/** Create an enhancer chain. */
export function createEnhancerChain(): EnhancerChain<{}, {}> {
  const enhancers: any[] = [];

  const enhancerChain: EnhancerChain<{}, {}> = {
    compose: (e: Function) => {
      enhancers.push(e);
      return enhancerChain as any;
    },
    checkThis: () => enhancerChain,
    forPropsOfType: () => enhancerChain as any,
    enhance: (c: any) => compose<any, any>(...enhancers)(c),
    omitKeysFromInProps: () => enhancerChain as any,
    omitKeysFromOutProps: () => enhancerChain as any,
    keepKeysForInProps: () => enhancerChain as any,
    keepKeysForOutProps: () => enhancerChain as any
  };

  return enhancerChain;
}

/** Create a type-safe licycle HOC. */
export function lifecycle<O>(spec: LifecycleF<O, {}, {}>): Enhancer<O, O> {
  return baseLifecyle(spec);
}

/** Create a type-safe HOC to omit certain keys from props. */
export function omitKeys<O, K extends Extract<keyof O, string>>(
  ...keys: readonly K[]
): Enhancer<OmitKeys<O, K>, O> {
  return baseMapProps(props => {
    const propCopy = { ...props };
    keys.forEach(key => delete propCopy[key]);
    return propCopy as any;
  });
}

/** Create a type-safe onlyUpdateForKeys. */
export function onlyUpdateForKeys<O, K extends Extract<keyof O, string>>(
  ...keys: readonly K[]
): Enhancer<O, O> {
  return baseOnlyUpdateForKeys(keys as any);
}

/** Create a type-safe withState HOC. */
export function withState<
  ExistingProps,
  StateName extends string,
  StateUpdateFuncName extends string,
  StateType
>(
  stateName: StateName,
  stateUpdateFuncName: StateUpdateFuncName,
  initialState: StateType
): Enhancer<
  ExistingProps &
    Readonly<{ [K in StateName]: StateType }> &
    Readonly<{ [K in StateUpdateFuncName]: (state: StateType) => StateType }>,
  ExistingProps
> {
  return baseWithState(stateName, stateUpdateFuncName, initialState) as any;
}
