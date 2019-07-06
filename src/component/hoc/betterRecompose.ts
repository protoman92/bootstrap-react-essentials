import { InferableComponentEnhancerWithProps as ICEW } from "react-redux";
import { ComponentEnhancer } from "recompose";
import compose from "recompose/compose";
import baseLifecyle from "recompose/lifecycle";
import baseMapProps from "recompose/mapProps";
import baseOnlyUpdateForKeys from "recompose/onlyUpdateForKeys";
import baseWithState from "recompose/withState";

declare module "recompose" {
  interface InferableComponentEnhancerWithProps<TInjectedProps, TNeedsProps>
    extends ComponentEnhancer<TInjectedProps, TNeedsProps> {}
}

/**
 * An enhancer chain allows for type-safe HOC composition. Instead of using
 * compose, use this chain to ensure type-safeness for the final component.
 */
interface EnhancerChain<I, O> {
  readonly enhance: ComponentEnhancer<I, O>;
  compose<I1>(e: ComponentEnhancer<I1, I>): EnhancerChain<I1, O>;
  compose<I1>(e: ICEW<I1, I>): EnhancerChain<I1, O>;
  checkThis(fn?: (i: I, o: O) => void): EnhancerChain<I, O>;
  forPropsOfType<P>(props?: P): EnhancerChain<P, P>;
}

/** Create an enhancer chain. */
export function createEnhancerChain<I = {}, O = {}>(): EnhancerChain<I, O> {
  const enhancers: Function[] = [];

  const enhancerChain: EnhancerChain<I, O> = {
    compose: (e: Function) => {
      enhancers.push(e);
      return enhancerChain;
    },
    checkThis: () => enhancerChain,
    forPropsOfType: () => enhancerChain as any,
    enhance: c => compose<any, any>(...enhancers)(c)
  };

  return enhancerChain;
}

/** Create a type-safe licycle HOC. */
export function lifecycle<O>(
  spec: Parameters<typeof baseLifecyle>[0]
): ComponentEnhancer<O, O> {
  return baseLifecyle(spec);
}

/** Create a type-safe HOC to omit certain keys from props. */
export function omitKeys<O, K extends Extract<keyof O, string>>(
  ...keys: readonly K[]
): ComponentEnhancer<OmitKeys<O, K>, O> {
  return baseMapProps(props => {
    const propCopy = { ...props };
    keys.forEach(key => delete propCopy[key]);
    return propCopy as any;
  });
}

/** Create a type-safe onlyUpdateForKeys. */
export function onlyUpdateForKeys<O, K extends Extract<keyof O, string>>(
  ...keys: readonly K[]
): ComponentEnhancer<O, O> {
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
): ComponentEnhancer<
  ExistingProps &
    Readonly<{ [K in StateName]: StateType }> &
    Readonly<{ [K in StateUpdateFuncName]: (state: StateType) => StateType }>,
  ExistingProps
> {
  return baseWithState(stateName, stateUpdateFuncName, initialState) as any;
}
