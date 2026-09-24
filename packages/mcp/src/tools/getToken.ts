import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { buildTokenTree } from '../tokenTree.js';
import { walkPath } from './pathWalker.js';

/**
 * Handler for the `get_token` MCP tool. Calls `buildTokenTree()` fresh (no caching, per
 * spec) then resolves `path` against it via `walkPath` (../tools/pathWalker.ts).
 *
 * `walkPath` throws on an unresolved path rather than returning null/undefined. That throw
 * is left to propagate: `McpServer`'s tool dispatch catches it and converts it into an MCP
 * tool error result (`isError: true`) automatically, so a bogus path surfaces to a client
 * as a tool error, not a silent empty/ok result.
 *
 * Exported directly (not only as a `registerTool` callback) so tests can exercise it
 * without going through a live server.
 */
export async function getTokenToolHandler({ path }: { path: string }): Promise<CallToolResult> {
  const tree = buildTokenTree();
  const node = walkPath(tree, path);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(node, null, 2),
      },
    ],
  };
}

export function registerGetTokenTool(server: McpServer): void {
  server.registerTool(
    'get_token',
    {
      title: 'Get design token',
      description:
        'Resolves a dotted path (e.g. "semantic.color.light.bg.primary") against the design token tree, ' +
        'read fresh from packages/tokens/tokens on every call, and returns the matching node. Throws an MCP ' +
        'tool error for a path that does not resolve.',
      inputSchema: {
        path: z
          .string()
          .describe('Dotted path into the token tree, e.g. "primitive.color.gray.900"'),
      },
    },
    ({ path }) => getTokenToolHandler({ path })
  );
}
