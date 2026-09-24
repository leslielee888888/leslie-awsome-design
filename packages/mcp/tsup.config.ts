import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // No .d.ts output - this package is never imported by another package
  // (it only ever runs as a standalone server process), so it has no public
  // type API to publish.
  dts: false,
  clean: true,
  outDir: 'dist',
});
