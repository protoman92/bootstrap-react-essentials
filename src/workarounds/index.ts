/** istanbul ignore next: Remember to call this only once per project. */
export function createWorkarounds(): Workarounds {
  return {
    apply: () => {
      const pushCBs: {
        [k: string]: HistoryWithCallbacks.StateChangeCallback;
      } = {};

      const replaceCBs: {
        [k: string]: HistoryWithCallbacks.StateChangeCallback;
      } = {};

      let stateChangeCount = 0;

      const historyWithCallbacks: HistoryWithCallbacks = {
        ...history,
        pushState: function(...args) {
          history.pushState(...args);
          Object.values(pushCBs).forEach(fn => fn("pushState", ...args));
        },
        replaceState: function(...args) {
          history.replaceState(...args);
          Object.values(replaceCBs).forEach(fn => fn("replaceState", ...args));
        },
        onStateChange: function(fn) {
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
        }
      };

      window.historyWithCallbacks = historyWithCallbacks;
    }
  };
}
