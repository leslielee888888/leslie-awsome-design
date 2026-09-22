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
      filename: path.basename(file),
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

  mkdirSync(distDir, { recursive: true });
  const tokensCss = readFileSync(tokensCssPath, 'utf-8');
  writeFileSync(path.join(distDir, 'styles.css'), `${tokensCss}\n${scopedCssChunks.join('\n')}\n`);
  console.log(
    `Wrote ${path.join('dist', 'styles.css')} (tokens.css + ${scopedCssChunks.length} component stylesheet(s))`
  );
}

main();
