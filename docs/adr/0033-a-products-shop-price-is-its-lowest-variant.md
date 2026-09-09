# 33. A Product's shop price is its lowest Variant's price

Date: 2026-09-08

## Status

Accepted

## Context

Price lives on the Variant, not the Product (ADR-0001). `docs/DATA-FLOW.md`
used that fact to refuse price sorting on the **admin** list, and refused it
honestly: sorting a Product by price "first requires deciding *which* Variant's
price. That is a real decision and not this one."

The shop cannot make the same refusal. `docs/STOREFRONT.md` needs a price
**filter** (a min/max range in reais) and two price **sorts** (*menor preço*,
*maior preço*), and a catalogue that cannot be sorted or filtered by price is
not a catalogue anyone will use.

It also turns out the decision was already made in passing, in the card spec:
"A multi-Variant Product shows its lowest Variant price, prefixed *A partir de*."
So one answer is written down for display and no answer is written down for
sorting and filtering — which is the arrangement that produces a grid ordered
by one number and labelled with a different one.

The alternatives are real. The Cover Variant's price (the Variant of the first
Image) would tie price to a photograph's position, which is a rule about
merchandising wearing a rule about money. A denormalised `price_from` column on
`product` would make the sort a plain indexed `ORDER BY`, at the cost of a
fourth denormalised value to keep in step with every Variant write — ADR-0004
already carries one of those and the maintenance is not free.

## Decision

**For every shop-facing purpose — the card, the filter and the sort — a
Product's price is `min(variant.price_amount)` across its Variants.**

One rule, one expression, three consumers, so the three cannot disagree. The
grid is ordered by the number it prints.

**It is computed, not stored.** No `price_from` column. Every Product has at
least one Variant (`CONTEXT.md`), so the minimum always exists and no Product
can fall out of a price-sorted list.

**The consequences are query shape, and they stay in the query.** The shop list
groups by Product and aggregates its Variants, so:

- the price filter is a **`HAVING`** clause over the aggregate, not a `WHERE`
  over a column
- `?preco_min` / `?preco_max` are **reais** in the URL and converted to cents
  at the schema seam, because `Money` is cents (`CONTEXT.md`) and no shopper
  types cents
- `total` can no longer count the same `where` flat the way
  `products.admin.list` does; it counts the grouped query as a subquery

A predicate that exists only as SQL is not a pure rule (`docs/MODULES.md`), so
none of this is extracted to a `<concept>.ts`. It lives in
`modules/products/server/shop.ts` with the query it belongs to.

## Consequences

`docs/DATA-FLOW.md`'s deferral is discharged, and only for the shop. The admin
list still does not sort by price, and its reason is untouched: an Admin's
question about price is about a *Variant*, which is a row in the form, not a
column in the catalogue.

**Every shop list that shows a price pays for a `GROUP BY`.** That is the price
of not denormalising, and it is bounded — the group is over an indexed foreign
key, and the page is 24 rows. The reopening trigger is a measured one: if the
grouped count query becomes the catalogue's slow half, `price_from` is the
answer, and it arrives as a migration with ADR-0004's maintenance shape to copy.

**A struck-through `compare_at_price_amount` belongs to the same Variant the
minimum came from**, not to any other. A card that showed the lowest price
beside a different Variant's discount would be quietly lying about the saving,
so the query carries the pair, not two independent aggregates.

*A partir de* is a display rule and stays in `docs/DESIGN.md`'s territory: this
ADR fixes the number, not the words around it.
