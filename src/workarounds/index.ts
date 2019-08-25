/** istanbul ignore next: Remember to call this only once per project. */
export function createWorkarounds(): Workarounds {
  return {
    apply: () => {
      const pushCBs: {
        [k: string]: History.StateChangeCallback;
      } = {};

      const replaceCBs: {
        [k: string]: History.StateChangeCallback;
      } = {};

      let stateChangeCount = 0;
      const pushState = history.pushState;
      const replaceState = history.replaceState;

      history.pushState = function(...args) {
        pushState.bind(history, ...args);
        Object.values(pushCBs).forEach(fn => fn("pushState", ...args));
      };

      history.replaceState = function(...args) {
        replaceState.bind(history, ...args);
        Object.values(replaceCBs).forEach(fn => fn("replaceState", ...args));
      };

      window.history.onStateChange = function(fn) {
        stateChangeCount += 1;
        const stateKey = `${stateChangeCount}`;
        pushCBs[stateKey] = (...args) => fn(...args);
        replaceCBs[stateKey] = (...args) => fn(...args);

        return {
          unsubscribe: () => {
            delete pushCBs[stateKey];
            delete replaceCBs[stateKey];
          }
        };
      };
    }
  };
}