import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildTokenTree } from '../tokenTree.js';

export const TOKENS_RESOURCE_URI = 'tokens://';

/**
 * Registers the `tokens://` MCP resource. Calls `buildTokenTree()` fresh on every read -
 * no caching - so an edit to any file under packages/tokens/tokens shows up on the very
 * next read, per the design spec (docs/prd/design-system-mcp.md §3).
 */
export function registerTokensResource(server: McpServer): void {
  server.registerResource(
    'tokens',
    TOKENS_RESOURCE_URI,
    {
      title: 'Design tokens',
      description:
        'The full merged design token tree (primitive, semantic, typography, shadow), read fresh from ' +
        'packages/tokens/tokens on every request.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(buildTokenTree(), null, 2),
        },
      ],
    })
  );
}
