# Classic Docker builder only (Synology Container Manager has no BuildKit) -
# no `# syntax=`, no `COPY --chmod`, no `RUN --mount`.
FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app

# --- builder ---
# Scoped to packages/mcp only: it builds and typechecks independently of the
# rest of the workspace (no runtime import of @leslielee888888/core or
# @leslielee888888/tokens - see src/tokenTree.ts and src/manifestPath.ts,
# both of which read their targets via relative filesystem paths, never a
# package import), so there's no need to build ui-react/core/tokens/
# frameworks-react here.
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter mcp build
# `pnpm deploy` produces a self-contained directory: the package's own files
# (including the dist/ and manifest.json just built/already committed) plus
# a node_modules pruned to only its production dependencies (--prod drops
# devDependencies entirely, which is where @leslielee888888/core and
# @leslielee888888/tokens live - they're only used by a test, not by
# dist/index.js's import graph, so pruning them is correct, not a gap).
# Deploying to packages/mcp (not the image root) preserves the same
# packages/mcp/{dist,manifest.json} nesting relative to packages/tokens/tokens
# that tokenTree.ts's and manifestPath.ts's relative-path resolution assumes.
RUN pnpm --filter mcp deploy packages-deploy/mcp --prod

# --- runtime: only what the server actually reads ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=builder /app/packages-deploy/mcp ./packages/mcp
COPY --from=builder /app/packages/tokens/tokens ./packages/tokens/tokens

EXPOSE 3000
CMD ["node", "packages/mcp/dist/index.js"]
