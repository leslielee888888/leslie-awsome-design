#!/usr/bin/env node
// Pre-build step run before tsup (see package.json's "build" script).
//
// tsup/esbuild has no working CSS Modules support (verified directly while
// writing this plan — importing a .module.css file produces an empty {}
// default export, with or without a third-party esbuild CSS-modules
// plugin, because tsup's own internal CSS handling claims .css files
// before any user esbuildPlugin runs). This script works around that by
// copying src/ to a gitignored .build-src/, resolving every *.module.css
// file's real scoped class names with lightningcss, writing a generated
// *.module.css.gen.js (+ .gen.d.ts) sibling with the resolved map, and
// rewriting the copied .tsx file's import to point at the generated file.
// tsup then builds from .build-src/, which contains no CSS imports at all
// by the time it runs.
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildSrcDir = path.join(packageRoot, '.build-src');
const distDir = path.join(packageRoot, 'dist');
const tokensCssPath = path.join(packageRoot, '..', 'tokens', 'dist-styles', 'tokens.css');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function main() {
  rmSync(buildSrcDir, { recursive: true, force: true });
  mkdirSync(buildSrcDir, { recursive: true });
  cpSync(path.join(packageRoot, 'src'), buildSrcDir, { recursive: true });

  const scopedCssChunks = [];

  for (const file of walk(buildSrcDir)) {
    if (!file.endsWith('.module.css')) continue;

    const source = readFileSync(file);
    const { code, exports } = transform({
      // The scope hash lightningcss embeds in each class name is a pure
      // function of this `filename` string alone (not file content or the
      // real path) - verified directly. Using just the basename would make
      // two same-named `*.module.css` files in different component folders
      // (e.g. two `Button.module.css`) collide on identical scope hashes;
      // since every component's resolved CSS is concatenated into one
      // global dist/styles.css, colliding rules would silently merge/
      // override each other. The path relative to .build-src is unique per
      // file, so it can't collide.
      filename: path.relative(buildSrcDir, file),
      code: source,
      cssModules: true,
    });
    scopedCssChunks.push(code.toString());

    const classMap = {};
    for (const [key, value] of Object.entries(exports ?? {})) classMap[key] = value.name;

    const base = path.basename(file);
    writeFileSync(`${file}.gen.js`, `export default ${JSON.stringify(classMap)};\n`);
    writeFileSync(
      `${file}.gen.d.ts`,
      'declare const classes: Record<string, string>;\nexport default classes;\n'
    );

    for (const srcFile of walk(path.dirname(file))) {
      if (!/\.tsx?$/.test(srcFile) || srcFile.endsWith('.d.ts')) continue;
      const content = readFileSync(srcFile, 'utf-8');
      const rewritten = content
        .replaceAll(`./${base}'`, `./${base}.gen.js'`)
        .replaceAll(`./${base}"`, `./${base}.gen.js"`);
      if (rewritten !== content) writeFileSync(srcFile, rewritten);
    }
  }

  // Safety net: the rewrite pass above only matches the specific import
  // spellings `./<base>'` / `./<base>"` relative to each CSS module's own
  // directory. If a future component (Tasks 6+) imports a stylesheet a way
  // that doesn't match - a different quote style, a differently-relative
  // path, etc. - the rewrite silently fails: tsup then falls back to its
  // broken, empty-{} CSS Modules handling, `pnpm build` still exits 0, and
  // every class name becomes `undefined` at runtime in the published
  // package, with nothing visibly wrong. Fail loudly instead: scan every
  // .ts/.tsx file left in .build-src and error out by name if any of them
  // still import a raw *.module.css path.
  for (const srcFile of walk(buildSrcDir)) {
    if (!/\.tsx?$/.test(srcFile) || srcFile.endsWith('.d.ts')) continue;
    const content = readFileSync(srcFile, 'utf-8');
    if (/\.module\.css['"]/.test(content)) {
      throw new Error(
        `build-styles.mjs: ${path.relative(packageRoot, srcFile)} still imports a raw *.module.css file after the CSS-Modules rewrite pass - the rewrite did not match this file's import. Fix the import spelling or extend build-styles.mjs's rewrite pass.`
      );
    }
  }

  mkdirSync(distDir, { recursive: true });
  const tokensCss = readFileSync(tokensCssPath, 'utf-8');
  writeFileSync(path.join(distDir, 'styles.css'), `${tokensCss}\n${scopedCssChunks.join('\n')}\n`);
  console.log(
    `Wrote ${path.join('dist', 'styles.css')} (tokens.css + ${scopedCssChunks.length} component stylesheet(s))`
  );
}

main();
