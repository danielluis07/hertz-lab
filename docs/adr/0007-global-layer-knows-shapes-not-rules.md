# 7. The global layer knows shapes, never rules

Date: 2026-09-02

## Status

Accepted

## Context

Hertz Lab will be organised into modules — catalog, cart, checkout, orders,
admin — each owning its own utilities. That leaves the question of what, if
anything, sits above them in `lib/` and `hooks/`. Without a stated rule, a
shared folder becomes the place code goes when nobody wants to decide where it
belongs, and every module ends up importing everything.

Three rules were considered.

**Zero-domain.** Global code may not know a single term from `CONTEXT.md`.
Clean, and wrong here: `formatBRL(cents)` is needed by catalog, cart, checkout,
orders and admin. Forcing five copies of it is the failure mode we would
actually hit, not the theoretical one.

**Two callers.** Global is whatever two or more modules need. Honest, but purely
reactive — it promotes `orderTotal(order)` the moment a second module renders a
total, and now business logic lives in `lib/`.

**Ubiquitous language.** Global holds the primitives plus the vocabulary every
module speaks: BRL cents, CPF/CNPJ, CEP, pt-BR dates. This is the right shape
but needs an edge, or it slides into the second rule's failure.

## Decision

**The global layer may know the shape of a value, never a rule about it.**

`formatBRL(123456)` is global: it knows money is BRL cents. `orderTotal(order)`
is not: it knows how an Order adds up. `documentSchema` is global: it knows a
CPF has eleven digits and two check digits. `checkoutSchema` is not: it knows
what checking out requires.

Where a case is genuinely ambiguous, the tie-breaker is **promote on the second
caller, never on the first** — no speculative globals.

Consequences of the rule, applied:

- Formatting, validation and normalisation of one value share one module
  (`lib/utils/document.ts` holds `formatDocument`, `isValidDocument` and
  `documentSchema`), because a formatter and its validator drift apart when
  filed under different folders.
- URL parameter names are *rules*, not shapes. ADR-0005 gives public routes
  Portuguese parameters and admin routes English ones, so `useQueryParam` takes
  the key as an argument and each module owns its own names.
- Pagination is pure functions, not a hook: shadcn's `PaginationLink` renders an
  anchor, so a page needs an href and a range, both computable on the server.
- Money stays a plain `number`. Branded `Cents` / `BasisPoints` types would
  catch a real bug class — the two units are both integers and sit in the same
  table — but Drizzle returns plain numbers, so the brand would only hold where
  someone remembered to cast, which is exactly where they would have caught it
  by reading. Clearly-named sibling formatters carry that weight instead.
- `nuqs` was rejected for URL state. It is better engineered than what we wrote,
  but the hook it replaces is forty lines and adds no dependency.

## Consequences

The line is now drawable by anyone: ask whether the function would still make
sense in a Brazilian store that sold something other than audio. `formatBRL`
would; `orderTotal` would not.

The cost is that some duplication across modules is now correct, and will look
like an oversight. Two modules each formatting an order status in their own way
is the rule working, not a missed extraction.

The rule is also why `lib/utils/index.ts` re-exports only `cn`: a barrel over
the whole directory would drag `env` and the `Intl` instances into every bundle
that wanted a class name. Everything else is imported from its own module.
