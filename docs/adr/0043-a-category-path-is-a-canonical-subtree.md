# 43. A Category path is a canonical subtree

Date: 2026-09-09

## Status

Accepted

## Context

`/produtos/[...categoria]` is a catch-all over a tree ADR-0022 bounded at two
levels, and it arrives with two questions nobody had to answer until a shopper
could type a URL.

**What a root Category page contains.** ADR-0022 deliberately declined to fix
this: _"Any Category may hold Products, children or not… 'A parent shows only
its children's products' is a query, not a constraint."_ `product.category_id`
is a single reference, so a Product hangs off a root or off a child, and
`/produtos/audio` can mean either the Products filed directly on Áudio or
everything beneath it.

That is not a cosmetic choice. **ADR-0042 gives the header flat root links and
no dropdown**, which makes a root Category page the most-linked catalogue
destination in the store. An Admin filing Products on the leaves — the natural
thing to do, and the shape _Áudio → Fones de ouvido_ invites — would leave every
header link landing on an empty grid. The store's primary navigation would be
dead, and nothing in the schema or the admin would report it.

**What a path means.** `category.slug` is `notNull().unique()` — globally
unique, not unique per parent. So the last segment identifies the Category on
its own, and the naive resolution reads only that segment. Then
`/produtos/fones`, `/produtos/audio/fones` and `/produtos/qualquer-coisa/fones`
all render the same Category, forever, and every one of them is shareable.
`CONTEXT.md` makes a Slug permanent precisely so links survive, which means a
duplicate-URL family here is permanent too.

ADR-0041 had already drawn the line this needs — a path segment names a
resource, a query string names a view — without applying it to a segment that
can be spelled several ways.

## Decision

**A Category path addresses a subtree, and it has exactly one spelling.**

**A root Category page includes its descendants' Products; a child page is
exactly its own.** The list is filtered on `categoryIds`, built as
`[category.id, ...category.children.map((c) => c.id)]`.

**A child's canonical URL is `/produtos/<pai>/<filho>`.** The path is validated
against the resolved Category, not merely used to find it:

- one segment must name a **root**
- two segments must name a child **whose parent's slug is the first segment**
- three or more segments are refused without a read, by ADR-0022's bound

Anything else is `notFound()` — soft, per ADR-0040, because
`produtos/loading.tsx` sits above the segment. Not a redirect: a fabricated
parent is not a URL that moved, it is a URL that never existed, and redirecting
would dignify an infinite family of them.

**One read serves the whole page.** `categories.shop.bySlug` returns the
Category with its parent's slug and its children:

```ts
{ id, name, slug, description, parent: { slug } | null,
  children: { id, name, slug, imageS3Key }[] }
```

That single row answers all four questions the route has — the heading and
description, the chain validation, the child strip, and the subtree ids — and
`null` becomes the `notFound()` on `MODULES.md`'s existing precedent.

## Consequences

**The root/child asymmetry is derived, not a branch.** `docs/STOREFRONT.md`
calls it load-bearing and describes it as a conditional — "a root Category page
opens with a strip of its children, and a child Category page does not" — but a
child _has_ no children, so the strip renders nothing and `categoryIds`
collapses to `[id]` **by the same expression**. There is one code path. A route
contract that reads as an `if` invites someone to write one, and the second
branch would then be free to drift from the first.

**The two-level bound is what keeps the subtree flat.** `categoryIds` is one
`IN` list built from a row already in hand, never a recursive CTE. A third level
would break this and not merely extend it, which is a consequence ADR-0022's
reopening trigger should be read alongside.

**The id array varies the query key, so it is sorted** before it reaches the
procedure. Two orderings of one subtree would otherwise cache as two entries
holding identical rows.

**Validation costs nothing extra.** The parent's slug and the children arrive in
the read the page already had to issue, so the canonical rule is a comparison,
not a query.

**Metadata gains something definite to point at.** A canonical URL per Category
is now fixed and enforced, which is the fact the map's deferred metadata work
was missing. This ADR does not decide titles, OG images or `sitemap.ts`: those
span all 19 routes and belong to one decision made once.

The reopening trigger is a merchandising need for a root page that excludes its
subtree — a "shop all of Áudio" that means something narrower than Áudio. Note
that it is expressible as a query parameter under ADR-0041 without touching this
rule, because that would be a view over the same resource.
