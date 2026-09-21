# @tokens

DTCG-format design tokens for the design system, sourced from the `Design
System` Figma file's `Primitive` and `UI` variable collections, its Inter
type-ramp text styles, and its two effect styles.

## Structure

- `tokens/primitive/` — raw color/spacing/radius scales, single mode, hidden
  from direct use (color/blue/600, spacing/md, etc.)
- `tokens/semantic/color.light.json` / `color.dark.json` — semantic UI tokens
  (color.bg.primary, color.text.primary, etc.), each a complete DTCG tree
  aliasing into `primitive/color.json` via `{group.token}` references
- `tokens/typography.json` — the Inter type ramp as DTCG `typography` tokens
- `tokens/shadow.json` — the two effect styles as DTCG `shadow` tokens

## Validating

```bash
pnpm --filter tokens run validate
```

Checks every file against `schema/dtcg.schema.json`, resolves every
`{group.token}` alias, and flags any token path defined in more than one
file. Exits non-zero on any failure. This also runs in CI on every push/PR
touching this package (`.github/workflows/validate-tokens.yml`).

## Syncing from Figma

Sync is **agent-driven, on-demand** — there is no automated pipeline pulling
from Figma. Figma's Variables REST API is documented as Enterprise-plan-only,
so a Claude Code session with the Figma plugin connected performs the sync
using the same MCP tools proven to work against this file.

To sync:

1. Start a Claude Code session with the Figma plugin connected to the
   `Design System` file.
2. Ask it to "sync design tokens for the tokens package."
3. The agent should:
   a. Read the `Primitive` and `UI` variable collections (`get_variable_defs`
      / `use_figma`), plus the Inter type-ramp text styles and the two
      effect styles.
   b. Map each variable/style into the DTCG shape documented above — slash
      names become nested groups, `VARIABLE_ALIAS` values become
      `{group.token}` reference strings, dimension values get a `px` unit
      appended.
   c. Overwrite the seven files under `tokens/`.
   d. Run `pnpm --filter tokens run validate` and fix any failures before
      reporting done.
   e. Summarize what changed (tokens added/removed/renamed) — call out any
      rename or removal explicitly, since those are breaking changes for any
      package consuming these tokens. Do not commit automatically; wait to
      be asked.
