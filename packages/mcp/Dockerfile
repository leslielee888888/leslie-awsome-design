# Classic Docker builder only (Synology Container Manager has no BuildKit) -
# no `# syntax=`, no `COPY --chmod`, no `RUN --mount`.
FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app

# --- builder: full workspace install + build (mirrors .github/workflows/ci.yml) ---
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# --- runtime: only what packages/mcp's server actually reads at runtime ---
# (see packages/mcp/src/tokenTree.ts and src/manifestPath.ts: both resolve
# their targets via relative filesystem paths from packages/mcp/{src,dist},
# never by importing @leslielee888888/tokens or @leslielee888888/core as
# packages - so neither package's own dist/build output is needed here,
# only tokens' raw, already-committed JSON source files.)
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/mcp/node_modules ./packages/mcp/node_modules
COPY --from=builder /app/packages/mcp/package.json ./packages/mcp/package.json
COPY --from=builder /app/packages/mcp/dist ./packages/mcp/dist
COPY --from=builder /app/packages/mcp/manifest.json ./packages/mcp/manifest.json
COPY --from=builder /app/packages/tokens/tokens ./packages/tokens/tokens

EXPOSE 3000
CMD ["node", "packages/mcp/dist/index.js"]
