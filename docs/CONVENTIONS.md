# Conventions

## Imports

Always prefer the `@` alias over relative parent imports.

```ts
// ✅ Good
import { Button } from "@/components/button";

// ❌ Avoid
import { Button } from "../../components/button";
```

# Component structure

A .tsx component file should contain only what is needed to render it.
Do not define standalone helper functions, formatters, validators, or business logic inside a component file. Extract them to a dedicated utility, hook, or module file.

# The global layer

`lib/` and `hooks/` are shared by every module. What belongs there is settled by
ADR-0007: **global code may know the shape of a value, never a rule about it.**
`formatBRL(cents)` is global; `orderTotal(order)` belongs to its module. When a
case is ambiguous, promote on the second caller, never on the first.

## Where things live

| Path | Holds |
| --- | --- |
| `lib/utils/*` | Pure, isomorphic helpers. One module per concept. |
| `lib/constants.ts` | Values true everywhere (`LOCALE`, `CURRENCY`). |
| `hooks/*` | Shared client hooks. |
| `modules/<name>/` | Everything that knows a rule. Anatomy and public surface: `docs/MODULES.md`. |
| `components/<group>/` | One route group's frame — its sidebar, header and nav. Authored global, may know rules, imported only by that group's layout (ADR-0015). |

Formatting, validation and normalisation of one value share one file:
`lib/utils/document.ts` exports `formatDocument`, `isValidDocument`,
`normalizeDocument` and `documentSchema` together.

Import from the specific module — `@/lib/utils/format`, not `@/lib/utils`.
`lib/utils/index.ts` re-exports only `cn`, because that is the path shadcn
writes into generated components; a full barrel would pull `env` and the `Intl`
formatters into every bundle that only wanted a class name.

## Runtime boundaries

Every shared file states which side of the client/server line it lives on:

- `hooks/*` begin with `"use client"`.
- Server-only code begins with `import "server-only"` — whether it holds a
  secret (`lib/auth-utils.ts`, `lib/s3.ts`) or simply must never reach a
  bundle. Every file under `modules/<name>/server/` carries it, and a
  `no-restricted-imports` rule guards that folder besides; the two fail at
  different moments on purpose (see `docs/MODULES.md`).
- `lib/utils/*` are isomorphic and mark nothing.

## Formatters

`Intl` formatters are constructed once at module scope, never per call —
`formatBRL` runs once per product card in a grid.

## shadcn components

Files under `components/ui/` are generated and `shadcn add` will overwrite them.
Do not edit one to refactor it; `hooks/use-mobile.ts` is left duplicating
`hooks/use-media-query.ts` for that reason. Do edit one to fix user-facing copy
or a genuine defect — `components/ui/pagination.tsx` is translated to pt-BR and
renders `next/link` — and leave a comment at the top saying what was changed.

## Tests

Pure utilities are tested with `bun test`. No runner to install: it ships with
Bun.

Tests live under `tests/`, mirroring the path of the file under test —
`lib/utils/format.ts` is tested by `tests/lib/utils/format.test.ts`. Mirroring
rather than colocating keeps `bun run build` from ever seeing a test file, and
gives `tests/modules/<name>/` an obvious home when the modules land.

`tests/setup.ts` runs before every test file (`[test] preload` in
`bunfig.toml`) and sets the whole environment, because `lib/env.ts` validates
at import time. It overwrites rather than defers to `.env`: tests assert on
those exact values, so a local `.env` must never change whether they pass.
