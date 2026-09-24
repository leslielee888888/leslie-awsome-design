import { readFileSync } from 'node:fs';
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
 */
function readTokenGroup(filePath: string, wrapperKey: string): unknown {
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (!(wrapperKey in data)) {
    throw new Error(
      `Expected top-level key "${wrapperKey}" in ${filePath}, found: ${Object.keys(data).join(', ')}`
    );
  }
  return data[wrapperKey];
}

/**
 * Reads the DTCG token JSON files under `tokensDir` (defaulting to the real
 * packages/tokens/tokens directory, resolved relative to this module) and assembles
 * them into a single merged tree. Reads fresh from disk on every call.
 */
export function buildTokenTree(tokensDir: string = DEFAULT_TOKENS_DIR): TokenTree {
  return {
    primitive: {
      color: readTokenGroup(path.join(tokensDir, 'primitive', 'color.json'), 'color'),
      spacing: readTokenGroup(path.join(tokensDir, 'primitive', 'spacing.json'), 'spacing'),
      radius: readTokenGroup(path.join(tokensDir, 'primitive', 'radius.json'), 'radius'),
    },
    semantic: {
      color: {
        light: readTokenGroup(path.join(tokensDir, 'semantic', 'color.light.json'), 'color'),
        dark: readTokenGroup(path.join(tokensDir, 'semantic', 'color.dark.json'), 'color'),
      },
    },
    typography: readTokenGroup(path.join(tokensDir, 'typography.json'), 'typography'),
    shadow: readTokenGroup(path.join(tokensDir, 'shadow.json'), 'shadow'),
  };
}
