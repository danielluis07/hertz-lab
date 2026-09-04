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
  secret (`lib/auth-guards.ts`, `lib/s3.ts`) or simply must never reach a
  bundle. Every file under `modules/<name>/server/` carries it, and a
  `no-restricted-imports` rule guards that folder besides; the two fail at
  different moments on purpose (see `docs/MODULES.md`).
- `lib/utils/*` are isomorphic and mark nothing.
- Browser-only code begins with `import "client-only"`, which is the same
  statement from the other side: `lib/upload.ts` is `XMLHttpRequest` and
  `createImageBitmap`, and that is precisely why it is not one of the
  `lib/utils/*` above (ADR-0021).

### Where `"use client"` goes

A component is a server component until something makes it otherwise, and what
makes it otherwise is narrow: a hook, an event handler, or a browser API.

The directive goes on the **smallest component that needs it**, never on the
nearest convenient parent. A frame keeps its markup on the server and splits the
interactive leaf into its own file, named for the thing that needs the browser:
`components/admin/admin-header.tsx` is a server component, and
`admin-user-menu.tsx` — which reads the session — is not.

Two qualifiers stop this from becoming a file-count tax:

- **Pass server components through client ones as `children` or props.** A
  client component's *imports* join the client graph; its children do not, so a
  server parent may render `SidebarProvider` and `ConfirmProvider` and stay a
  server component. `app/(admin)/layout.tsx` is the worked example.
- **Split only when the server half has content of its own.** If extracting the
  leaf leaves a parent that does nothing but forward props, the parent *was* the
  interactive thing: mark it and keep it whole.

The payload saved by any one split is small, because nearly every file under
`components/ui/` is already `"use client"`. Legibility is the reason to do it:
`grep -rn '"use client"'` is meant to read as an inventory of the app's
interactive surface, which only works while the directive sits where the
interactivity actually is.

`docs/DATA-FLOW.md` applies this to the read path — why the filter bar is the
only client component on a list page, and why sort headers are anchors.

## Formatters

`Intl` formatters are constructed once at module scope, never per call —
`formatBRL` runs once per product card in a grid.

## shadcn components

Files under `components/ui/` are generated and `shadcn add` will overwrite them.
Do not edit one to refactor it; `hooks/use-mobile.ts` is left duplicating
`hooks/use-media-query.ts` for that reason. Do edit one to fix user-facing copy, a
genuine defect, or an import the project does not have — `pagination.tsx` is
translated to pt-BR and renders `next/link`, and `sonner.tsx` drops the
`next-themes` import it is generated with — and leave a comment at the top
saying what was changed.

## Tests

Code that knows a rule is tested with `bun test`. No runner to install: it
ships with Bun. Code that knows only a shape is not — which is why there are no
tests for `server/` or for components. ADR-0017 has the argument;
`docs/MODULES.md` has what it means inside a module.

Tests live under `tests/`, mirroring the path of the file under test —
`lib/utils/format.ts` is tested by `tests/lib/utils/format.test.ts`, and
`modules/products/admin/schemas.ts` by
`tests/modules/products/admin/schemas.test.ts`. Mirroring rather than
colocating keeps `bun run build` from ever seeing a test file.

`tests/setup.ts` runs before every test file (`[test] preload` in
`bunfig.toml`) and sets the whole environment, because `lib/env.ts` validates
at import time. It overwrites rather than defers to `.env`: tests assert on
those exact values, so a local `.env` must never change whether they pass.
