import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { flattenTokens } from './validate';

type TokenMap = Map<string, { type: string; value: unknown }>;

const ALIAS_PATTERN = /^\{([a-zA-Z0-9_.-]+)\}$/;

function loadTokenFile(filePath: string): TokenMap {
  const raw = readFileSync(filePath, 'utf-8');
  return flattenTokens(JSON.parse(raw) as Record<string, unknown>);
}

function mergeTokenMaps(...maps: TokenMap[]): TokenMap {
  const merged: TokenMap = new Map();
  for (const map of maps) {
    for (const [key, value] of map) merged.set(key, value);
  }
  return merged;
}

export function resolveTokenValue(tokenPath: string, lookup: TokenMap): string {
  const seen = new Set<string>();
  let currentPath = tokenPath;
  for (;;) {
    if (seen.has(currentPath)) {
      throw new Error(`Circular alias reference starting at "${tokenPath}"`);
    }
    seen.add(currentPath);
    const token = lookup.get(currentPath);
    if (!token) {
      throw new Error(`Unresolved token reference: "${currentPath}" (from "${tokenPath}")`);
    }
    if (typeof token.value !== 'string') {
      throw new Error(
        `Token "${currentPath}" has a non-string value; generate-css only supports string token values`
      );
    }
    const match = token.value.match(ALIAS_PATTERN);
    if (!match) return token.value;
    currentPath = match[1];
  }
}

function toCssVarName(tokenPath: string): string {
  return `--${tokenPath.replace(/\./g, '-')}`;
}

export function buildTokensCss(
  primitives: TokenMap,
  lightSemantic: TokenMap,
  darkSemantic: TokenMap
): string {
  const lightLookup = mergeTokenMaps(primitives, lightSemantic);
  const darkLookup = mergeTokenMaps(primitives, darkSemantic);

  const rootLines: string[] = [];
  for (const tokenPath of primitives.keys()) {
    rootLines.push(`  ${toCssVarName(tokenPath)}: ${resolveTokenValue(tokenPath, primitives)};`);
  }
  for (const tokenPath of lightSemantic.keys()) {
    rootLines.push(`  ${toCssVarName(tokenPath)}: ${resolveTokenValue(tokenPath, lightLookup)};`);
  }

  const darkLines: string[] = [];
  for (const tokenPath of darkSemantic.keys()) {
    darkLines.push(`  ${toCssVarName(tokenPath)}: ${resolveTokenValue(tokenPath, darkLookup)};`);
  }

  return `:root {\n${rootLines.join('\n')}\n}\n\n:root[data-theme="dark"] {\n${darkLines.join('\n')}\n}\n`;
}

export function buildTailwindThemeCss(primitives: TokenMap, lightSemantic: TokenMap): string {
  const lines: string[] = [];
  for (const tokenPath of [...primitives.keys(), ...lightSemantic.keys()]) {
    const varName = toCssVarName(tokenPath);
    lines.push(`  ${varName}: var(${varName});`);
  }
  return `@theme {\n${lines.join('\n')}\n}\n`;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const tokensDir = path.join(scriptDir, '..', 'tokens');
  const distStylesDir = path.join(scriptDir, '..', 'dist-styles');

  const primitives = mergeTokenMaps(
    loadTokenFile(path.join(tokensDir, 'primitive', 'color.json')),
    loadTokenFile(path.join(tokensDir, 'primitive', 'spacing.json')),
    loadTokenFile(path.join(tokensDir, 'primitive', 'radius.json'))
  );
  const lightSemantic = loadTokenFile(path.join(tokensDir, 'semantic', 'color.light.json'));
  const darkSemantic = loadTokenFile(path.join(tokensDir, 'semantic', 'color.dark.json'));

  writeFileSync(
    path.join(distStylesDir, 'tokens.css'),
    buildTokensCss(primitives, lightSemantic, darkSemantic)
  );
  writeFileSync(
    path.join(distStylesDir, 'tailwind-theme.css'),
    buildTailwindThemeCss(primitives, lightSemantic)
  );
  console.log('Wrote dist-styles/tokens.css and dist-styles/tailwind-theme.css');
}
