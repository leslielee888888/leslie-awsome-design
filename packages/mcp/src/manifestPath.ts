import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// packages/mcp/src -> packages/mcp/manifest.json
export const MANIFEST_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'manifest.json'
);

/**
 * Reads manifest.json fresh from disk on every call (no caching, per spec) and returns its
 * raw text. The single place that resolves the on-disk manifest path and reads the file -
 * shared by the `components://manifest` resource (../resources/manifest.ts, which serves
 * this text as-is) and the `get_component` tool (../tools/getComponent.ts, which
 * JSON.parses it to look up an entry), so the two callers can't drift on path resolution
 * or the read itself, only on what they do with the result.
 *
 * Async (not `readFileSync`) so this disk read on the request path of a long-lived, shared
 * NAS-hosted server never blocks Node's single event loop.
 */
export async function readManifestFile(manifestPath: string = MANIFEST_PATH): Promise<string> {
  return readFile(manifestPath, 'utf-8');
}
