# 36. A write invalidates what it changes on the shop, not what module it lives in

Date: 2026-09-09

## Status

Accepted

## Context

ADR-0031 left the write path an obligation with no address: "any Admin mutation
that changes what a shop route renders must call `revalidatePath` for the
affected paths. Nothing in the type system enforces this." That was correct and
unusable — at the time, "the affected paths" could have been most of the shop.

ADR-0035 shrinks it to something a person can hold. The catalogue routes are
dynamic, so they have no cache entry to invalidate. What is left holding stale
catalogue data is exactly **two** paths: `/`, which re-derives its Categorias
strip and its Novidades row from the catalogue, and `/produto/[slug]`.

That is small enough to write down, and a table that fits on a screen is worth
more than a rule nobody can apply. But a table alone is a list maintained by
memory, and the entry most likely to be missed is the one that proves it: Review
moderation lives in the reviews module and changes `ratingAverage` (ADR-0004) on
a *products* route.

`revalidatePath` is available here, and this is the part that is easy to doubt.
It is documented for Server Functions and **Route Handlers**, and
`app/api/trpc/[trpc]/route.ts` is a Route Handler, so a tRPC mutation may call
it. Its signature takes either a literal path or a route pattern plus a `type`:
`revalidatePath('/produto/[slug]', 'page')` invalidates every page matching that
file (`03-api-reference/04-functions/revalidatePath.md` L149-154).

## Decision

**The obligation follows what a write changes on the shop, never which module
the write lives in.** The table below is derived from that rule; a new write
path is checked against the rule, not looked up in the table.

Two kinds of entry, and the difference is deliberate:

| Write | Invalidates |
| --- | --- |
| `products.admin.create` | `/` |
| `products.admin.publish` | `/`, `/produto/<slug>` |
| `products.admin.archive` | `/`, `/produto/<slug>` |
| `products.admin.update` | `/`, `/produto/<slug>` — **and `/produto/<old-slug>` when the slug changed** |
| `products.admin.update` moving a Product between Categories | additionally **`/produto/[slug]`, `'page'`** |
| `brands.admin.update` (rename) | `/`, **`/produto/[slug]`, `'page'`** |
| `categories.admin.*` | `/` |
| Review moderation (approve / reject) | `/produto/<slug>` |
| The checkout write (ADR-0039) | `/produto/<slug>`, once per **distinct** Product in the Order |

**Literal paths are the default. The pattern is for genuine fan-out only** — a
Brand rename changes the meta line on every product page of that Brand, and a
Product changing Category changes the *related Products* section of every other
Product in both the old and the new one. Neither has a bounded path list without
running a query inside the write path, which would make the write own a read it
does not otherwise need and would itself go stale as Categories nest. The
pattern drops every product page's cache entry at once. That is blunt, it is
named as blunt, and it is cheap because regeneration is lazy: one background
render per page, on its next first visit, for an act an Admin performs rarely.

**`publish` invalidates its path unconditionally.** Whether a `notFound()`
result is itself cached is not stated in the bundled docs, and this ADR declines
to assert it from memory. Written this way the question does not need an answer:
if 404s are not cached the call is a no-op, and if they are, it is the difference
between a published Product being visible and being invisible until someone
happens to edit it again.

**Stock is invalidated by the sale, not by the next Admin write.** A prerendered
product page renders stock state server-side, so without this the store shows
*em estoque* on a Product it has just sold out of. Overselling is a
customer-facing failure, not a stale-content annoyance, which is why it is worth
a call and the Brand-rename staleness is not.

## Consequences

**The checkout write reaches across a module boundary, and it is a path string,
not a `products` internal.** ADR-0029 makes a dependency a matter of reading
another module's rows; `revalidatePath('/produto/' + slug)` reads nothing. The
slug is already in the line the checkout wrote. This does not give `orders` an
edge to `products` and does not disturb ADR-0029's finding that `orders` is a
sink.

**`/` is invalidated coarsely and that is accepted.** Novidades is the newest
active Products, so most `products.admin.update` calls change nothing on it. The
alternative is asking, per write, whether the Product is in the top row — a
question whose answer is a query, to avoid a lazy background render of one page.

**Nothing enforces any of this**, exactly as ADR-0031 said, and ADR-0031's
refusal of a time-based `revalidate` floor is what makes that survivable: a
missed call surfaces as a stale page and gets fixed, rather than being masked an
hour later by a timer. With the surface down to two paths, a missed call is now
findable by reading the write procedures.

**Two of these procedures do not exist yet.** The checkout write is #102 and
Review moderation is unwritten. The table is a contract for when they are built,
not a description of code.
