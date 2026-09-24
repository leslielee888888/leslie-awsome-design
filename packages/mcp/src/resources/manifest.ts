import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readManifestFile } from '../manifestPath.js';

export const MANIFEST_RESOURCE_URI = 'components://manifest';

/**
 * Registers the `components://manifest` MCP resource. Reads manifest.json fresh from disk
 * on every read - no caching - and returns its contents as-is, so a manifest regenerated
 * by scripts/generate-manifest.ts shows up on the very next read, per the design spec
 * (docs/prd/design-system-mcp.md §3).
 */
export function registerManifestResource(server: McpServer): void {
  server.registerResource(
    'component-manifest',
    MANIFEST_RESOURCE_URI,
    {
      title: 'Component manifest',
      description:
        "The generated component manifest (packages/mcp/manifest.json) describing each component's " +
        'config/state/props shape.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: readManifestFile(),
        },
      ],
    })
  );
}
