/**
 * Shape of the accessor a behavior factory is handed after creation, via
 * `setGetProp`. Deliberately duplicated from `core`'s own `GetProp<T>`
 * (rather than imported) — `frameworks/react` depends on nothing but `react`,
 * so it defines the same structural shape locally. TypeScript's structural
 * typing means any `core` behavior satisfying this shape is assignable here
 * without the two packages sharing a type.
 */
export type GetProp<T> = <K extends keyof T>(key: K) => T[K];
