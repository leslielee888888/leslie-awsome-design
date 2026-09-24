import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { request as httpRequest } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
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

/**
 * Sends a raw POST /mcp with a real MCP `initialize` JSON-RPC request, using an explicit
 * `Host` header (which the MCP client's own transport can't override - `Host` is a
 * forbidden header under the Fetch spec). Connects by IP so only the `Host` header,
 * not the actual TCP destination, varies - exactly what a LAN client behind a hostname/IP
 * different from `127.0.0.1` looks like from the server's perspective.
 */
function postInitialize(
  port: number,
  hostHeader: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'host-header-test-client', version: '0.0.0' },
      },
    });

    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          Host: hostHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf-8');
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * StreamableHTTPServerTransport may respond to a POST with either a plain JSON body or an
 * SSE-framed one (`event: message\ndata: {...}\n\n`), depending on the request's `Accept`
 * header and the transport's own heuristics. Parses either shape into the JSON-RPC payload.
 */
function parseJsonRpcBody(body: string): unknown {
  const trimmed = body.trim();
  if (!trimmed.startsWith('event:') && !trimmed.startsWith('data:')) {
    return JSON.parse(trimmed);
  }
  const dataLine = trimmed.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) {
    throw new Error(`No "data:" line found in SSE body: ${body}`);
  }
  return JSON.parse(dataLine.slice('data:'.length).trim());
}

describe('MCP server Host-header allow-list (LAN reachability, not just 127.0.0.1)', () => {
  const lanHost = 'design-system-mcp.nas.local';

  it('rejects a non-localhost Host header by default (localhost-only, safe for local dev)', async () => {
    const httpServer = await startServer(0);
    try {
      const { port } = httpServer.address() as AddressInfo;

      const { status, body } = await postInitialize(port, lanHost);

      expect(status).toBe(403);
      expect(body).toContain('Invalid Host');
    } finally {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('accepts a non-localhost Host header and completes a real MCP handshake when that host is allow-listed (simulates ALLOWED_HOSTS on the NAS)', async () => {
    const httpServer = await startServer(0, { allowedHosts: [lanHost] });
    try {
      const { port } = httpServer.address() as AddressInfo;

      const { status, body } = await postInitialize(port, lanHost);

      expect(status).toBe(200);
      const parsed = parseJsonRpcBody(body) as { result?: { serverInfo?: { name?: string } } };
      expect(parsed.result?.serverInfo?.name).toBe('design-system-mcp');
    } finally {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
