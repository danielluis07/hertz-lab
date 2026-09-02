# 11. Hydration follows what the client reads

Date: 2026-09-02

## Status

Accepted

## Context

The tRPC + TanStack Query setup in `trpc/server.tsx` offers two ways for a
server component to get data, and the scratch file the project started from
showed both without saying when each applied:

1. `prefetch(trpc.x.queryOptions())` wrapped in `<HydrateClient>`, consumed by a
   client component with `useSuspenseQuery`.
2. A detached server `caller`, annotated "for static rendering".

That second reason is wrong here. ADR-0006 puts `requireAdmin()` in every admin
`page.tsx`; `requireAdmin()` reads `headers()`; so every admin route is already
dynamic and admin has no static rendering to opt into. Taken at face value, the
comment retires `caller` from the admin surface entirely.

The upstream example is also not neutral. Its shape — prefetch everything at the
top of the page, wrap the whole tree in `<HydrateClient>` — is what a reader
naturally copies, and it has a cost the example is too small to show: anything
fetched through `getQueryClient` is dehydrated and shipped to the browser
**whether or not a client component reads it**. A page that server-renders a
heading, a breadcrumb and a summary card through the prefetch path sends all
three to the client as JSON that nothing will ever deserialise into a component.

Three rules were considered.

**Per page.** If any part of the page is interactive, the whole page uses
prefetch/hydrate, and `caller` is deleted. One path to learn, and it reads
consistently. It fails the mixed page, which is the common case rather than the
exception: `/admin/products/[id]` needs the product name for a heading and an
existence check, and needs the variant list in an interactive table. Under this
rule the `notFound()` check has to move into a client component or be
duplicated.

**By render location.** `caller` for anything the server renders, prefetch for
anything the client renders. Intuitive, and it breaks on the value both need —
the product name in the `<h1>` and the product in the edit form — which it
answers with two round-trips for one row.

**By readership.** The unit is the query, and the question is who reads it.

## Decision

**A query is prefetched and hydrated if and only if a client component calls
`useSuspenseQuery` on it.** Everything else goes through `caller`.

`caller` is therefore not "data rendered on the server" but **data no client
query exists for** — nothing hydrates it because nothing on the client will ask
for it.

Where a client component reads a query *and* the server component needs the
value, the page awaits the same fetch rather than issuing a second one:
`load()` returns the data and leaves the cache populated for dehydration. The
two helpers differ only in whether they are awaited, since TanStack Query 5.102
collapsed `fetchQuery`, `prefetchQuery` and `ensureQueryData` into a single
`query()`.

Two consequences are part of the decision rather than separate rules:

- **`<HydrateClient>` goes at the page root**, unnarrowed. Scoping it to a
  subtree would guard against a violation of this rule rather than against
  over-hydration itself; when the rule holds, the dehydrated set is already
  exactly what the client reads.
- **The input object is computed once on the server and passed down as a prop.**
  Keys hash with `JSON.stringify` and drop `undefined`, so a client that
  re-derives its own input can produce a key that misses the hydrated one —
  which does not error, it just refetches. Passing the object makes parity
  structural.

## Consequences

The rule is checkable in review without running anything: point at the
`useSuspenseQuery`, or use `caller`. Reviewers do not have to reason about
rendering strategy, and the answer does not change when a page later gains an
interactive section — only the queries that section reads move.

The cost is that one page legitimately uses two mechanisms, so the read path is
never uniform. `data-flow.tsx`'s single-mechanism shape was simpler to describe,
and this is the trade accepted for not shipping dead payload and not fetching
the same row twice.

A second cost: the rule is stated in terms of a call in a *different file* from
the one you are editing. Deleting the last `useSuspenseQuery` in a client
component is what makes a page's `prefetch` wrong, and nothing enforces the
pairing. The failure is benign — a slightly larger payload, never a bug — which
is also why it will not be noticed. `docs/DATA-FLOW.md` carries the worked
example so the pairing is at least visible in one place.
