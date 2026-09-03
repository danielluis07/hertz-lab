# 17. Tests follow rules, not layers

Date: 2026-09-03

## Status

Accepted

## Context

`docs/CONVENTIONS.md` promises `tests/modules/<name>/` and the folder has never
had an inhabitant. ADR-0010 settled the seam that decides what could go in it:
anything expressible as a pure function of already-fetched data must be one, at
the module root, where `bun test` reaches it with no database; what is left in
`server/` is queries, and it recorded that queries "are tested against Postgres
or not at all" without choosing which.

Choosing is this decision. It is three questions, not one, because a module has
three kinds of code and the answer differs for each.

### Procedures

Three options.

**Not tested.** The pure-rule layer carries the weight, and the residue in a
procedure — parse input, one `db.query` call, return — is not covered.

**A Neon branch per run.** A script creates a branch, migrates it, runs the
suite, drops it. It matches the driver already in use.

**A local Postgres container.** `db/index.ts` uses `drizzle-orm/neon-serverless`
with `@neondatabase/serverless`'s `Pool`, a WebSocket driver: it cannot talk to
a container over TCP. That path needs Neon's `wsproxy` alongside the container,
or a second Drizzle driver (`drizzle-orm/node-postgres` plus `pg`, neither
installed) switched in for tests only — which means tests would exercise a
driver production never uses.

One fact decides it, and it is not about databases. **There is no CI.** There is
no `.github/` at all, so every test in this repo runs on one developer's machine
when that developer remembers. A suite that runs unattended and blocks a merge
earns its infrastructure. A suite that runs when someone thinks of it goes red
and stays red, and a red suite is worse than no suite because it teaches people
to ignore the runner.

Both database options are real infrastructure, not a flag: an API token and a
branch lifecycle script, or a proxy sidecar. Meanwhile the bug class ADR-0010
says a database test catches — a wrong `where`, a missing `with`, an unused
index — is caught on the first page load in a one-developer project with a live
dev database. The infrastructure is unconditional; the payoff is marginal.

One case argued for an exception and is recorded because the argument was good:
the nested write from the products module. A Product with at least one Variant
(ADR-0001), plus Specification rows and image keys, written together — ADR-0016
fixed it as one mutation because a Product with no Variant is invalid, so create
cannot be staged. A partial write there corrupts an aggregate, which is worse
than a wrong `where`. But one database test costs the *entire* apparatus: the
token, the lifecycle, the migration run, a `bun test` that no longer works
offline. You pay all of the infrastructure for one file, and "just this one
case" has never stayed at one.

### Schemas

A schema is sometimes a shape and sometimes a rule, and only the second is worth
a test. ADR-0014's list-params schema is the second: `.catch()` on every field,
so `parse` **cannot throw**; garbage silently becomes defaults; unknown keys are
stripped; an array value falls to its default with no `preprocess`; and the same
object is both the URL parser and the procedure's `.input()`, so it must be
idempotent. Those are claims that ADR asserts in prose. `z.string().min(1)` on a
form field asserts nothing — testing it tests that Zod works.

### Components

`AGENTS.md` requires that components contain only render logic, and ADR-0016
pushed the two rules that were nearby into shared, global files: `FilterBar`
holds "a filter change drops `page`" and `lib/utils/sort.ts` holds the sort
href, both in the global layer that the existing convention already tests.

Testing components would mean `happy-dom` and `@testing-library/react`, neither
installed. `bunfig.toml`'s `preload` is a single global array applied to every
test file, so registering a DOM would put one under all eight existing pure
tests as well.

## Decision

**A test follows a rule. Where the code knows no rule, there is no test.**

**Pure rules and rule-bearing schemas are tested.** Both live at the module root
by construction, both run under `bun test` with no database, no DOM and no new
dependency. A schema is tested when it holds a rule — defaults, coercion,
`.catch()` behaviour, refinements — and not when it only describes a shape.

**`server/` is not tested.** Procedures are not tested at all, and this is
absolute: no exception for the nested write, no designated hard case. Its
protection is that it *is* a transaction, which Drizzle rolls back whole, plus
whatever validation ADR-0016's one-form-one-mutation rule hoists to the module
root ahead of it.

**Components are not tested, app-wide.** Not "not yet". A component that would
reward a test is a component that broke the render-logic-only rule; the fix is
to move the rule out to the module root, where it is tested by the first clause.

**The reopening trigger is CI, and only CI.** This decision is contingent on
there being nowhere for a suite to run unattended. When CI exists, the procedure
question reopens as its own decision — not automatically as a "yes", but as a
question that finally has a good answer available. A second developer is not the
trigger; they would bring CI with them. "A bug reached production" is not the
trigger either: it is hindsight, and nobody can act on it today.

Tests mirror rather than colocate, which `docs/CONVENTIONS.md` already fixed:
`modules/products/admin/schemas.ts` is tested by
`tests/modules/products/admin/schemas.test.ts`. The audience axis continues into
`tests/` for the same reason it continues into `server/`. No module gains a
tests folder in its anatomy.

## Consequences

The rule is drawable without reading this file: ask whether the code knows a
rule. If it does it is at the module root, and code at the module root is
tested.

The absences stop reading as gaps. `server/` has no tests because ADR-0010 left
nothing in it but queries; `components/` has none because the render-logic-only
rule left nothing in them but markup. Both are the earlier rules working, in the
same way ADR-0007 makes some duplication across modules correct rather than an
oversight.

The cost is real and worth stating plainly: **the most failure-prone code in the
application is the least covered.** The nested write is named above precisely so
that nobody has to rediscover the argument, and so that the first thing to
reconsider when CI arrives is obvious.

The second cost is that a query regression reaches a page before it reaches a
test. In a one-developer project that page is the developer's own, minutes
later. That ratio is what this decision is betting on, and it is exactly what
changes when the trigger fires.

`tests/setup.ts` is untouched by all of this and stays load-bearing: nothing
here reads a database, but a module's rule file can still import `lib/env.ts`
transitively through `lib/utils/*`, and `lib/env.ts` validates at import time.
Because no test needs a real `DATABASE_URL`, its placeholder stays a
placeholder, and `bunfig.toml` keeps its single preload.
