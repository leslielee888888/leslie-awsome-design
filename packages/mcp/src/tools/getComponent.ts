import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MANIFEST_PATH, readManifestFile } from '../manifestPath.js';

export type ComponentManifest = Record<string, unknown>;

/** Reads manifest.json fresh from disk (via ../manifestPath.ts) and parses it. */
async function parseManifest(manifestPath: string = MANIFEST_PATH): Promise<ComponentManifest> {
  return JSON.parse(await readManifestFile(manifestPath)) as ComponentManifest;
}

/**
 * Handler for the `get_component` MCP tool. Looks up `name` in the manifest and throws
 * (not a null/empty result) when it isn't present, using `Object.hasOwn` - not `in` - so a
 * name like "constructor" or "toString" can't resolve to an inherited Object.prototype
 * member instead of a real "not found" error, matching ../tools/pathWalker.ts's approach
 * for `get_token`.
 *
 * That throw is left to propagate: `McpServer`'s tool dispatch catches it and converts it
 * into an MCP tool error result (`isError: true`) automatically.
 *
 * Exported directly (not only as a `registerTool` callback) so tests can exercise it
 * without going through a live server.
 */
export async function getComponentToolHandler(
  { name }: { name: string },
  manifestPath: string = MANIFEST_PATH
): Promise<CallToolResult> {
  const manifest = await parseManifest(manifestPath);

  if (!Object.hasOwn(manifest, name)) {
    throw new Error(`No component "${name}" found in the manifest`);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(manifest[name], null, 2),
      },
    ],
  };
}

export function registerGetComponentTool(server: McpServer): void {
  server.registerTool(
    'get_component',
    {
      title: 'Get component manifest entry',
      description:
        'Looks up a component by name in the generated component manifest (packages/mcp/manifest.json), ' +
        'read fresh from disk on every call, and returns its config/state/props shape. Throws an MCP tool ' +
        'error for a name that is not in the manifest.',
      inputSchema: {
        name: z.string().describe('Component name as it appears in the manifest, e.g. "pin-input"'),
      },
    },
    ({ name }) => getComponentToolHandler({ name })
  );
}
