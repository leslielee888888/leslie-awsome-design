import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServer } from '../index';
import { buildTokenTree } from '../tokenTree';

// packages/mcp/src/__tests__ -> packages/mcp/manifest.json
const manifestPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'manifest.json'
);

// Accepts `unknown[]` rather than a precise content/resource-content union: readResource's
// text/blob variants and callTool's text/image/audio/resource(_link) variants don't share a
// single structural shape, so this narrows at runtime instead of trying to type-union them.
function textOf(items: readonly unknown[]): string {
  const [first] = items;
  if (
    first &&
    typeof first === 'object' &&
    'text' in first &&
    typeof (first as { text: unknown }).text === 'string'
  ) {
    return (first as { text: string }).text;
  }
  throw new Error('Expected a single text content/resource block');
}

describe('MCP server smoke test (real HTTP server + real MCP client over Streamable HTTP)', () => {
  let httpServer: HttpServer;
  let transport: StreamableHTTPClientTransport;
  let client: Client;

  beforeAll(async () => {
    // Port 0 -> the OS assigns an ephemeral free port.
    httpServer = await startServer(0);
    const { port } = httpServer.address() as AddressInfo;

    client = new Client(
      { name: 'design-system-mcp-smoke-test', version: '0.0.0' },
      { capabilities: {} }
    );
    transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("reads the tokens:// resource and matches buildTokenTree()'s direct output", async () => {
    const result = await client.readResource({ uri: 'tokens://' });

    expect(result.contents).toHaveLength(1);
    expect(JSON.parse(textOf(result.contents))).toEqual(buildTokenTree());
  });

  it('reads the components://manifest resource and matches the on-disk manifest.json', async () => {
    const result = await client.readResource({ uri: 'components://manifest' });

    expect(result.contents).toHaveLength(1);
    expect(JSON.parse(textOf(result.contents))).toEqual(
      JSON.parse(readFileSync(manifestPath, 'utf-8'))
    );
  });

  it('calls get_token with a real valid path and succeeds', async () => {
    const result = await client.callTool({
      name: 'get_token',
      arguments: { path: 'semantic.color.light.bg.primary' },
    });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(textOf(result.content as unknown[]))).toEqual({
      $type: 'color',
      $value: '{color.white}',
    });
  });

  it('calls get_token with a bogus path and gets back an MCP tool error', async () => {
    const result = await client.callTool({
      name: 'get_token',
      arguments: { path: 'not.a.real.path.at.all' },
    });

    expect(result.isError).toBe(true);
  });

  it('calls get_component("pin-input") and succeeds', async () => {
    const result = await client.callTool({
      name: 'get_component',
      arguments: { name: 'pin-input' },
    });

    expect(result.isError).not.toBe(true);
    const entry = JSON.parse(textOf(result.content as unknown[])) as {
      config: { interfaceName: string };
    };
    expect(entry.config.interfaceName).toBe('PinInputProps');
  });

  it('calls get_component("nonexistent") and gets back an MCP tool error', async () => {
    const result = await client.callTool({
      name: 'get_component',
      arguments: { name: 'nonexistent' },
    });

    expect(result.isError).toBe(true);
  });
});
