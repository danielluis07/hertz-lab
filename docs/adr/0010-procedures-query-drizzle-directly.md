# 10. A procedure queries Drizzle directly

Date: 2026-09-02

## Status

Accepted

## Context

`docs/MODULES.md` gives every module a `server/` folder and leaves what is
inside it open. The question it leaves is how many layers sit between a tRPC
procedure and the database.

The default answer in most codebases is a repository: an object per aggregate
exposing `findAll`, `findById`, `save`, with the procedure calling it and never
touching the ORM. It is the shape everyone expects, which is exactly why not
having one needs recording.

Three options were considered.

**A repository per module.** `ProductRepository` with an interface, injected
through tRPC context. Buys a seam for testing and one place per module where
queries live. Costs a layer that is, honestly, a one-line passthrough most of
the time: `findById(id)` wrapping `db.query.product.findFirst({ where })` adds
a name and nothing else.

**A query module per module.** No class and no interface, just exported
functions in `server/queries.ts` that take arguments and return rows. Cheaper
than a repository and keeps shared queries in one place — but written *upfront*
it is the same passthrough with fewer keystrokes, and it creates a file that
exists because the convention says so rather than because a caller needed it.

**Nothing.** The procedure calls `db` itself.

## Decision

**Procedures call `db` directly. There is no repository, and no query layer is
created before a second caller needs one.**

Two things specific to this stack decide it.

Drizzle's relational query builder is already the query layer. `db.query`
returns typed, nested objects from a declarative description — it is not raw SQL
that a wrapper would be protecting anyone from. A repository over `db.query` is
an abstraction over an abstraction, and the thing it hides is the more readable
of the two.

The seam a repository buys is a *mocking* seam, and for a query layer that buys
confidence in the mock rather than in the query. The bugs that actually occur
here are a wrong `where`, a missing `with`, an index that is not used — none of
which a mocked repository can fail on. A real Postgres is the only thing that
catches them, and it catches them just as well with the query inline.

Extraction is governed by the tie-breaker this repo already uses everywhere
else, from ADR-0007: **promote on the second caller, never on the first.** When
a second procedure needs the same query, it becomes a plain exported function in
`server/queries.ts` — arguments in, rows out, no class, no interface, no
injection. The first procedure to need a query just writes it.

For the same reason `db` stays a direct import rather than moving into
`createTRPCContext`. Context injection exists to make the database swappable,
and this decision is that we do not want it swapped.

## Consequences

A procedure is readable top to bottom: input, query, rule, return. Nothing about
how a Product is fetched is more than one file away from the procedure that
fetches it.

The cost is that a query used by exactly one procedure lives inside it, so
duplication is possible and will look like an oversight — two procedures
selecting overlapping columns before either has been promoted. That is the
tie-breaker working; the promotion happens on the second caller, not in
anticipation of one.

The cost that is real rather than apparent: `server/` code cannot be unit-tested
without a database. This is accepted deliberately, and it is what makes the
rule in `docs/MODULES.md` load-bearing — **anything expressible as a pure
function of already-fetched data must be one**, and lives at the module root
where `bun test` reaches it with no database at all. What is left in `server/`
is queries, and queries are tested against Postgres or not at all.

That last clause is resolved by ADR-0017: **not at all.** The absence of CI, not
the absence of a seam, is what decides it, and CI is the trigger that reopens
it.
