import { describe, it, expect } from 'vitest';
import { createStore } from './createStore';

describe('createStore', () => {
  it('starts with the given initial state', () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('merges a patch into state via setState', () => {
    const store = createStore({ count: 0, label: 'a' });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, label: 'a' });
  });

  it('notifies subscribers when setState is called', () => {
    const store = createStore({ count: 0 });
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.setState({ count: 1 });
    expect(calls).toBe(1);
  });

  it('notifies subscribers when notify() is called directly, without changing state', () => {
    const store = createStore({ count: 0 });
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.notify();
    expect(calls).toBe(1);
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('stops notifying after unsubscribe', () => {
    const store = createStore({ count: 0 });
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.setState({ count: 1 });
    unsubscribe();
    store.setState({ count: 2 });
    expect(calls).toBe(1);
  });
});
