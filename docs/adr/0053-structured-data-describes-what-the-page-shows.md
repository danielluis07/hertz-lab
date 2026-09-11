# 53. Structured data describes what the page shows

Date: 2026-09-11

## Status

Accepted

## Context

`/produto/[slug]` is the one Storefront route with something to say to a search
engine beyond a title: a price, a stock state, a rating, a Brand, photographs.
Next has no JSON-LD support at all — `<script>` is listed under *Unsupported
Metadata* — so every graph is markup this repo writes by hand, which means
nothing stops it from claiming whatever it likes.

Two proposals for that graph looked obviously good and were not.

**Individual `Review` objects inside the `Product`.** The page server-renders
five approved Reviews and a client leaf appends more from a cursor
(`docs/STOREFRONT.md`). Any fixed graph therefore names a subset that stops
matching the page after one "load more" — and the mismatch is permanent, not
transient, because the graph is baked into an ISR-cached route while the list
grows.

**A `BreadcrumbList`.** The route had no visible breadcrumb, and its projection
returned `categoryId` for Related Products but no Category name or slug. So the
markup would have described a trail that did not exist, built from data the page
did not read.

Both are the same error in different clothes: markup asserting something the
rendered page does not support. It is also the error with the worst failure
mode, because it is invisible — the page looks right, and what is wrong is only
legible to a crawler.

## Decision

**Every fact in a graph comes from the same `cache()`d read the route renders
from, and describes something the page actually shows.** One rule, and the two
proposals resolve in opposite directions.

**No `Review` objects; `aggregateRating` instead**, emitted only when
`ratingCount > 0`. The aggregate is a single value the page also displays in the
Buy panel's rating summary, and it cannot drift as the island pages in more
Reviews, because it is not a list. `aggregateRating` says everything the review
markup was there to say.

**The `BreadcrumbList` stays, and the page grows a visible breadcrumb to match.**
Not markup without a trail, and not dropping the graph — the trail is the thing
that was actually missing. `/produto/[slug]` and `/produtos/[...categoria]` both
render `Início › Produtos › <root> › <child> › <Product>`, collapsing a segment
when the Category is a root, and `products.shop.bySlug` returns
`category: { name, slug, parentSlug }` so the trail has names and a canonical
path to link. ADR-0043 already makes that path well-defined.

The visible trail earns its place without the rich result: **a Product page
currently has no upward path to its own Category.** The header carries flat root
links with no dropdown (ADR-0042), so a shopper who lands on one pair of
headphones from a search engine cannot reach the other headphones. That is a
navigational hole this map opened, and the breadcrumb closes it.

**The rest of the graph, fixed.** `Product` on `/produto/[slug]` with `name`,
`description`, every Image in the projection with the Cover first, `brand`, and
an `AggregateOffer` carrying `lowPrice`, `highPrice`, `priceCurrency: "BRL"` and
an availability derived from summed Variant stock; a single-Variant Product
emits a plain `Offer` with its `sku`. `Organization` and `WebSite` on `/`, the
former drawing its facts from `lib/store.ts` and its `logo` from the committed
square mark. No `SearchAction`: it targets a sitelinks searchbox that is
effectively retired, and it would promise a search surface the home page does
not own.

## Consequences

Two emitted build issues are amended rather than left to discover this:
[Build the Product route](https://github.com/danielluis07/hertz-lab/issues/123)
gains the breadcrumb, the Category projection fields, and the `Product` graph;
[Build the category route](https://github.com/danielluis07/hertz-lab/issues/110)
gains the breadcrumb and its graph. This is the one place metadata work reaches
into route *structure*, and it does so because the alternative was markup that
lies.

The rule also decides a question nobody asked: **structured data never gets its
own query.** A second read for a graph can return a price the visible page does
not show — ISR caches the rendered route (ADR-0031), so the page's price is as
old as its cache entry while a fresh read is not. Sharing the `cache()`d read
makes disagreement impossible rather than unlikely.

`aggregateRating`'s zero-guard is not cosmetic: `product.rating_average` and
`rating_count` both default to `0` and are derived from approved Reviews
(ADR-0004), so an unreviewed Product would otherwise publish a rating of zero
out of five to every search engine that reads it.
