import type { Server as HttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { registerTokensResource } from './resources/tokens.js';
import { registerManifestResource } from './resources/manifest.js';
import { registerGetTokenTool } from './tools/getToken.js';
import { registerGetComponentTool } from './tools/getComponent.js';

const SERVER_NAME = 'design-system-mcp';
const SERVER_VERSION = '0.0.0';
const DEFAULT_PORT = 3000;

/**
 * Builds a fresh `McpServer` with both resources (`tokens://`, `components://manifest`)
 * and both tools (`get_token`, `get_component`) registered. Called once per incoming
 * request in stateless mode (see `startServer`), so there is no state shared between
 * requests.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerTokensResource(server);
  registerManifestResource(server);
  registerGetTokenTool(server);
  registerGetComponentTool(server);

  return server;
}

function resolvePort(): number {
  const raw = process.env.PORT;
  if (!raw) {
    return DEFAULT_PORT;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

/**
 * Starts the MCP server on `port` (default: the `PORT` env var, falling back to 3000).
 * Streamable HTTP only - no stdio mode - since this runs as a shared, long-lived,
 * NAS-hosted process (docs/prd/design-system-mcp.md §3).
 *
 * Stateless, following the SDK's own `simpleStatelessStreamableHttp` example: each POST
 * /mcp request gets its own `McpServer` + `StreamableHTTPServerTransport` pair
 * (`sessionIdGenerator: undefined`), torn down when the response closes. GET and DELETE
 * on /mcp (session resumption / termination) aren't supported in stateless mode and
 * return 405, matching that example.
 *
 * Returns a promise that resolves with the listening `http.Server` once it is actually
 * listening, so callers (including tests) can read back the bound port via
 * `server.address()` - useful when `port` is 0 (an ephemeral port).
 */
export function startServer(port: number = resolvePort()): Promise<HttpServer> {
  const app = createMcpExpressApp();

  app.post('/mcp', async (req, res) => {
    const server = createServer();
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  const methodNotAllowed = (
    _req: unknown,
    res: { writeHead: (code: number) => { end: (body: string) => void } }
  ) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      })
    );
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  return new Promise((resolve, reject) => {
    const httpServer = app.listen(port);
    httpServer.once('listening', () => {
      console.log(
        `${SERVER_NAME} listening on port ${port === 0 ? (httpServer.address() as { port: number }).port : port}`
      );
      resolve(httpServer);
    });
    httpServer.once('error', reject);
  });
}

// Only start listening when this file is run directly (e.g. `tsx src/index.ts` or the
// built `node dist/index.js`), not when `createServer`/`startServer` are imported by tests.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void startServer();
}
