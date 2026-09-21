export function createStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());
  const setState = (patch: Partial<T>) => {
    state = { ...state, ...patch };
    notify();
  };

  return {
    getState: (): Readonly<T> => state,
    setState,
    notify,
    subscribe: (fn: () => void): (() => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
