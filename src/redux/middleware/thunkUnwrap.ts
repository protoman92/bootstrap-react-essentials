import { Middleware } from "redux";

export default function(): Middleware<{}, ReduxAction<any>> {
  return () => dispatch => (action: ReduxAction<any>) => {
    dispatch(action);

    if (action.payload instanceof Function) {
      dispatch(action.payload);
    }
  };
}
