import { createContext, useContext } from 'react';

/**
 * Builds the "share a behavior with descendants, guard against use outside
 * its Root" wiring every compound behavior needs, written once here instead
 * of every compound component in `ui-react` hand-rolling its own
 * `createContext`/`useContext`/non-null-assertion.
 */
export function createBehaviorContext<TBehavior>() {
  const Context = createContext<TBehavior | null>(null);

  function useBehaviorContext(componentName: string): TBehavior {
    const value = useContext(Context);
    if (!value) {
      throw new Error(`${componentName} must be used within its Root`);
    }
    return value;
  }

  return { Provider: Context.Provider, useBehaviorContext };
}
