import { AnyAction } from "redux";
import createThunkUnwrapMiddleware from "./thunkUnwrap";

describe("Thunk unwrap middleware", () => {
  it("Should dispatch correctly", () => {
    // Setup
    const dispatched: AnyAction[] = [];
    const middleware = createThunkUnwrapMiddleware();

    const dispatcher = middleware({
      dispatch: a => a,
      getState: () => ({} as any)
    })(a => {
      dispatched.push(a);
      return a;
    });

    // When
    dispatcher({ payload: () => {} });

    // Then
    expect(dispatched).toHaveLength(2);
    expect(dispatched[0]).toBeInstanceOf(Object);
    expect(dispatched[1]).toBeInstanceOf(Function);
  });
});
