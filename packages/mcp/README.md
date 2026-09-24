# @mcp

An MCP (Model Context Protocol) server exposing this design system's DTCG
design tokens and a generated component manifest, so an AI coding agent can
discover what tokens and components exist without a human pasting them in.
Deployed as a Docker container on Leslie's NAS — a shared, long-running
process, not an installable library, so this package is `"private": true`
and never published via the `tsup`/Changesets pipeline the other three
packages use.

## Structure

- `src/index.ts` — server entry point (Streamable HTTP transport, stateless)
- `src/resources/tokens.ts`, `src/resources/manifest.ts` — the two MCP
  resources (see below)
- `src/tools/getToken.ts`, `src/tools/getComponent.ts` — the two MCP tools
- `src/tokenTree.ts`, `src/tools/pathWalker.ts` — assembles the merged DTCG
  token tree and resolves dotted paths into it
- `scripts/generate-manifest.ts` — the manifest generator (see below)
- `manifest.json` — generated, committed output of the generator

## Connecting

Point an MCP client (Streamable HTTP transport) at:

```
http://<host>:<port>/mcp
```

`<host>`/`<port>` depend on where this is running — see Deployment below for
the NAS-hosted instance.

**Resources:**

- `tokens://` — the merged DTCG token tree (`primitive.color`,
  `primitive.spacing`, `primitive.radius`, `semantic.color.light`,
  `semantic.color.dark`, `typography`, `shadow`)
- `components://manifest` — the generated component manifest (`manifest.json`)

**Tools:**

- `get_token(path)` — looks up one token by dotted path into the same tree
  `tokens://` returns, e.g. `get_token("primitive.color.gray.900")`,
  `get_token("semantic.color.light.bg.primary")`, `get_token("typography.body")`,
  `get_token("shadow.sm")`. An unresolved path is an MCP tool error, not an
  empty result.
- `get_component(name)` — looks up one behavior's manifest entry by name,
  e.g. `get_component("pin-input")`. An unknown name is an MCP tool error.

## Regenerating the manifest

The manifest is generated from `packages/core`'s TypeScript source (its
config/state/prop-getter interfaces, including JSDoc descriptions and
`@default` tags) via `ts-morph` — not hand-maintained, and not read live by
the running server. Like `tokens`' Figma sync, this is a manual,
agent-reproducible "run script → review diff → commit" step, never an
automatic trigger:

```bash
pnpm --filter mcp generate-manifest
```

Review the diff in `manifest.json`, then commit. Run this after adding a new
behavior to `packages/core`, or after changing an existing one's
config/state/prop-getter interfaces — nothing regenerates it for you.

## Building

```bash
pnpm --filter mcp build
```

Produces `dist/index.js` via `tsup` (no `.d.ts` output — this package is
never imported by another package, only run as a standalone process).

## Deployment

Docker Compose, following the house NAS pattern used for Leslie's other
self-hosted services:

```bash
cd packages/mcp
cp .env.example .env   # then edit ALLOWED_HOSTS for your actual host/IP
docker compose up -d --build
```

`ALLOWED_HOSTS` (comma-separated hostnames/IPs) is required for any real LAN
client to connect — see `.env.example` and the doc comment on
`resolveAllowedHosts()` in `src/index.ts` for why. Leaving it unset restricts
the server to `localhost` only (fine for local dev, wrong for the NAS).

On the NAS, this deploys to `/volume1/docker/lad-mcp/` via the house
`git archive | tar -x` flow, rebuilt with
`sudo -n /usr/local/bin/docker compose up -d --build` over SSH.
