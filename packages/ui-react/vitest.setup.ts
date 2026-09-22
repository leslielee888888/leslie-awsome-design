import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// @testing-library/react's built-in auto-cleanup only registers itself when
// `afterEach` exists as a global (e.g. Jest's default globals, or Vitest with
// `test.globals: true`). This project's vitest.config.ts does not enable
// globals, so without this explicit call, DOM trees from earlier tests in the
// same file accumulate and later `getByRole` queries fail with "multiple
// elements found". Verified directly: Button.test.tsx's later assertions
// failed with that exact error until this was added.
afterEach(() => {
  cleanup();
});
