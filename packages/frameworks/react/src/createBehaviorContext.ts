import { createContext, useContext } from 'react';

/**
 * Builds the "share a behavior with descendants, guard against use outside
 * its Root" wiring every compound behavior needs, written once here instead
 * of every compound component in `ui-react` hand-rolling its own
 * `createContext`/`useContext`/non-null-assertion.
 *
 * `rootName` is passed once, here, at creation — not by every leaf part at
 * every call site. A component family with N parts (PinInput.Input,
 * PinInput.HiddenInput, ...) would otherwise need N names defined somewhere,
 * multiplied by however many compound components this package ends up with;
 * one name per family, used in every part's error message, scales to any
 * number of parts and any number of components for free. The error message
 * doesn't say exactly which part was misused, but React's own component
 * stack (visible in the thrown error) already does — the family name is
 * enough to say what actually went wrong ("used outside its Root").
 */
export function createBehaviorContext<TBehavior extends object>(rootName: string) {
  const Context = createContext<TBehavior | null>(null);

  function useBehaviorContext(): TBehavior {
    const value = useContext(Context);
    // `TBehavior extends object` rules out a legitimate falsy value (0, '', false)
    // ever reaching here, so a strict null check (not a truthiness check) is enough.
    if (value === null) {
      throw new Error(`${rootName} components must be used within a <${rootName}.Root>`);
    }
    return value;
  }

  return { Provider: Context.Provider, useBehaviorContext };
}
