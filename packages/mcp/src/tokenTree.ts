import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Merged in-memory tree assembled from packages/tokens/tokens/**\/*.json.
 * This is the exact shape served by the `tokens://` MCP resource, and the shape
 * `walkPath` (../tools/pathWalker.ts) descends for the `get_token` MCP tool -
 * same addressing scheme, same tree.
 *
 * Each source JSON file has exactly one top-level key matching its own token
 * category (e.g. `primitive/color.json` is `{ "color": { ... } }`). That
 * wrapper key is stripped when the file is assigned into the tree, so paths
 * read as `primitive.color.gray.900`, `semantic.color.light.bg.primary`,
 * `typography.body`, `shadow.sm` - single-wrapped, per the design spec
 * (docs/prd/design-system-mcp.md §3) - rather than doubling the category name
 * (`primitive.color.color.gray.900`).
 *
 * Leaf values below the unwrap point are the raw parsed DTCG `$type`/`$value`
 * groups, `$value` sometimes an alias reference string like "{color.gray.900}".
 */
export interface TokenTree {
  primitive: {
    color: unknown;
    spacing: unknown;
    radius: unknown;
  };
  semantic: {
    color: {
      light: unknown;
      dark: unknown;
    };
  };
  typography: unknown;
  shadow: unknown;
}

// packages/mcp/src -> packages/tokens/tokens
const DEFAULT_TOKENS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'tokens',
  'tokens'
);

/**
 * Reads and parses a token JSON file, then returns the value under its single
 * top-level wrapper key (e.g. reading primitive/color.json with `wrapperKey`
 * "color" returns `{ "color": {...} }`'s `.color`, not the whole file).
 *
 * Async (not `readFileSync`) so a disk read on this long-lived, shared
 * NAS-hosted server's request path never blocks Node's single event loop -
 * important since `buildTokenTree` does up to seven of these per `tokens://`
 * read or `get_token` call.
 */
async function readTokenGroup(filePath: string, wrapperKey: string): Promise<unknown> {
  const raw = await readFile(filePath, 'utf-8');
  const data: unknown = JSON.parse(raw);

  // A malformed token file's top level might be null, an array, or another
  // primitive - guard before using the `in` operator (which throws a raw
  // TypeError on a non-object right-hand side) so callers always get our
  // descriptive error instead.
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(
      `Expected top-level key "${wrapperKey}" in ${filePath}, but the file's top level is not an object (got ${Array.isArray(data) ? 'an array' : typeof data})`
    );
  }

  if (!(wrapperKey in data)) {
    throw new Error(
      `Expected top-level key "${wrapperKey}" in ${filePath}, found: ${Object.keys(data).join(', ')}`
    );
  }
  return (data as Record<string, unknown>)[wrapperKey];
}

/**
 * Reads the DTCG token JSON files under `tokensDir` (defaulting to the real
 * packages/tokens/tokens directory, resolved relative to this module) and assembles
 * them into a single merged tree. Reads fresh from disk on every call.
 *
 * Sequential, not `Promise.all` - each read still never blocks the event loop (that's
 * what makes this async at all), but running them in parallel would race all seven
 * reads against each other, and a directory missing one of the later files (as the
 * malformed-input test fixtures deliberately do, to isolate the one file under test)
 * could then reject with an unrelated ENOENT from a file nobody meant to test, instead
 * of the specific, descriptive error `readTokenGroup` produces for the actually-malformed
 * one. Sequential awaits preserve the same first-failure-wins order plain synchronous
 * calls would have had.
 */
export async function buildTokenTree(tokensDir: string = DEFAULT_TOKENS_DIR): Promise<TokenTree> {
  const primitiveColor = await readTokenGroup(
    path.join(tokensDir, 'primitive', 'color.json'),
    'color'
  );
  const primitiveSpacing = await readTokenGroup(
    path.join(tokensDir, 'primitive', 'spacing.json'),
    'spacing'
  );
  const primitiveRadius = await readTokenGroup(
    path.join(tokensDir, 'primitive', 'radius.json'),
    'radius'
  );
  const semanticLight = await readTokenGroup(
    path.join(tokensDir, 'semantic', 'color.light.json'),
    'color'
  );
  const semanticDark = await readTokenGroup(
    path.join(tokensDir, 'semantic', 'color.dark.json'),
    'color'
  );
  const typography = await readTokenGroup(path.join(tokensDir, 'typography.json'), 'typography');
  const shadow = await readTokenGroup(path.join(tokensDir, 'shadow.json'), 'shadow');

  return {
    primitive: { color: primitiveColor, spacing: primitiveSpacing, radius: primitiveRadius },
    semantic: { color: { light: semanticLight, dark: semanticDark } },
    typography,
    shadow,
  };
}
