import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['.build-src/index.ts'],
  format: ['esm'],
  dts: true,
  // NOT `clean: true`: build-styles.mjs (run just before this in the
  // package's "build" script) writes dist/styles.css before tsup starts.
  // tsup's clean option wipes the whole outDir first, which deletes that
  // file before tsup ever writes index.js/index.d.ts alongside it -
  // verified directly (dist/styles.css exists right after build-styles.mjs
  // runs, then is gone immediately after a `clean: true` tsup run).
  // build-styles.mjs fully recreates .build-src and overwrites
  // dist/styles.css from scratch on every run, so skipping tsup's clean
  // does not risk stale output here.
  clean: false,
  outDir: 'dist',
  tsconfig: 'tsconfig.build.json',
});
