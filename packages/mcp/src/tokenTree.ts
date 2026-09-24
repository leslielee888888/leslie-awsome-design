import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Merged in-memory tree assembled from packages/tokens/tokens/**\/*.json.
 * This is the exact shape served by the `tokens://` MCP resource, and the shape
 * `walkPath` (../tools/pathWalker.ts) descends for the `get_token` MCP tool -
 * same addressing scheme, same tree.
 *
 * Each leaf is the *raw parsed content* of its source JSON file (DTCG `$type`/`$value`
 * groups, `$value` sometimes an alias reference string like "{color.gray.900}"),
 * assigned as-is under the category key - it is not unwrapped or re-shaped.
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

function readJson(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Reads the DTCG token JSON files under `tokensDir` (defaulting to the real
 * packages/tokens/tokens directory, resolved relative to this module) and assembles
 * them into a single merged tree. Reads fresh from disk on every call.
 */
export function buildTokenTree(tokensDir: string = DEFAULT_TOKENS_DIR): TokenTree {
  return {
    primitive: {
      color: readJson(path.join(tokensDir, 'primitive', 'color.json')),
      spacing: readJson(path.join(tokensDir, 'primitive', 'spacing.json')),
      radius: readJson(path.join(tokensDir, 'primitive', 'radius.json')),
    },
    semantic: {
      color: {
        light: readJson(path.join(tokensDir, 'semantic', 'color.light.json')),
        dark: readJson(path.join(tokensDir, 'semantic', 'color.dark.json')),
      },
    },
    typography: readJson(path.join(tokensDir, 'typography.json')),
    shadow: readJson(path.join(tokensDir, 'shadow.json')),
  };
}
