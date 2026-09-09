# 32. The shop hydrates only what a shopper's own write can change

Date: 2026-09-08

## Status

Accepted

## Context

`docs/DATA-FLOW.md` gives one mechanical test for choosing a read path, and it
turns on a single question: *does a client component call `useSuspenseQuery` on
it?* Answer yes and the query is `prefetch`ed or `load`ed, dehydrated by
`<HydrateClient>` and shipped to the browser; answer no and it is a `caller`
call that ships nothing.

On the admin half the answer is yes for every list, and ADR-0016's amendment
(#31) says why: a list whose rows carry a status transition fires
`invalidateQueries`, and invalidation only refetches queries a **mounted**
component is observing. A server-rendered table observes nothing, so the row
action would write to the database and change nothing on screen. The client
table is not a preference; it is what makes the write visible.

The shop half was left unspecified, and the natural move is to mirror admin —
the catalogue is a list with a filter bar, the admin list is a list with a
filter bar, so copy the shape. That inference is wrong, and two facts break it.

**There are no writes against the catalogue.** A shopper cannot publish,
archive or moderate anything. Nothing a shopper does invalidates
`products.shop.list`; the only thing that changes a catalogue is an Admin
writing on a different surface entirely, which reaches the shop through
revalidation and not through a query cache.

**ADR-0031 caches the rendered route.** The Storefront's caching story is
whole-route ISR, never query caching. A hydrated catalogue would therefore ship
its rows twice — once as the markup inside the cached HTML, once as a
dehydrated cache riding alongside it — and then, thirty seconds after mount,
`staleTime` would expire and the browser would refetch rows that the ISR had
already served for free. The dehydration is pure cost on exactly the routes the
cache exists to make cheap.

## Decision

**On the Storefront, a query is hydrated if and only if a shopper's own write
can change it. `caller` is the default; `prefetch` and `load` are the exception
and must be argued.**

Read through `caller`, shipping no `<HydrateClient>` and no dehydrated cache:

- the catalogue grid, on `/produtos` and `/produtos/[...categoria]`
- the product page and its Specifications
- the home page's derived sections
- the five institucional pages
- the header's Category links and the footer

Read through `prefetch` or `load`, because a mutation a shopper fires
invalidates them:

- the **Cart** — both `/carrinho` and the header badge that has to move the
  instant a line is added
- the **Wishlist** control, which toggles against the selected Variant
- the **reviews island**, if and only if it turns out to own client state that
  a shopper's own submission changes

The filter bar stays a client component and this decision does not touch it: it
**writes the URL** rather than reading a query, so it needs no cache on either
side of the boundary. The same holds for sort headers and pagination, which
ADR-0016 already made anchors.

The mechanical test in `docs/DATA-FLOW.md` is unchanged and still governs. This
ADR only records what its first column evaluates to on the shop, and why the
answer differs from admin's without the test differing.

## Consequences

The catalogue ships less JavaScript and fewer bytes than the admin list that
looks identical to it, which is the correct outcome for the half of the store
that faces the public and the half that is cached.

**The grid is server markup, so it cannot dim on a filter change** the way the
admin table does. `data-pending` is driven by `useOptimistic` inside the filter
bar, which is still a client component, so the attribute and the ancestor's
`group-has-data-pending:opacity-50` both survive — what changes is that the
content under it re-renders from the server rather than refetching. The pending
affordance is unaffected; the mechanism beneath it is.

**A shop surface that grows a write grows a hydrated query with it**, and that
is the trigger to revisit a specific query rather than this rule. The rule is
what makes the change legible: adding `prefetch` to a catalogue route should
read as a question — *what does a shopper write here?* — and if there is no
answer, the addition is a mistake.

The asymmetry with admin is deliberate and will look like an inconsistency to
anyone reading the two lists side by side. It is the ADR-0027 audience split
reaching the data layer: two audiences, two caching stories, one test.
