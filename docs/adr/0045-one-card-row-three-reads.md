# 45. One card row, three reads

Date: 2026-09-09

## Status

Accepted

## Context

The product card is the most reused component in the store. Three surfaces
render it: the catalogue grid on `/produtos` and `/produtos/[...categoria]`,
`/`'s _Novidades_, and the related-Products section on `/produto/[slug]`. Each
is a different query with a different `where` — newest, filtered, same-Category —
and the three are specified in three different tickets.

ADR-0033 fixed the number the card prints: a Product's shop price is
`min(variant.price_amount)`, computed not denormalised, and it made the point
that one rule with three consumers is what stops the three disagreeing.

It does not go far enough for the card, and the gap is easy to miss. **The
minimum tells the card the price but not the label.** `docs/STOREFRONT.md`
specifies "a multi-Variant Product shows its lowest Variant price, prefixed _A
partir de_", and once a row carries only the minimum, a Product with one Variant
and a Product with five look identical. Nothing in ADR-0033, `DATA-FLOW.md` or
`STOREFRONT.md` says how the card learns which it is holding.

Left unstated, each of the three reads would answer it separately, or two of
them would forget to. That is the failure ADR-0033 wrote itself to prevent,
displaced from the number onto the words beside it.

## Decision

**One exported row type, `ProductCardRow`, which all three shop reads project
identically:**

```ts
type ProductCardRow = {
  slug: string;
  name: string;
  brandName: string;
  coverS3Key: string;
  coverAltText: string;
  priceAmount: number;
  compareAtPriceAmount: number | null;
  variantCount: number;
};
```

**`variantCount > 1` is the _A partir de_ test.** It matches
`docs/STOREFRONT.md`'s wording literally: the prefix is a fact about the Product
having more than one thing to buy, not about those things being priced
differently.

The alternative was `hasMultiplePrices` — distinct prices > 1 — which would stop
two same-priced Variants saying _A partir de R$ 100_. It is rejected because it
makes the card's label depend on a coincidence of pricing: an Admin editing one
Variant's price would change the wording on a different Product's card with no
edit to that Product, and nobody would connect the two.

**The card lives at `modules/products/shop/components/product-card.tsx`.**
ADR-0007's promotion gate requires a second **module** and it does not fire —
all three callers are `products` surfaces. It does not go in `components/`.

**The Cover join is inner, not left.** `CONTEXT.md` refuses to publish an
imageless Product, and only `active` Products are visible (`MODULES.md`), so a
visible Product always has a Cover. A `LEFT JOIN` with a placeholder would
defend against a state the write path forbids, and would hide a real bug if that
guarantee ever broke.

**`compare_at_price_amount` belongs to the Variant the minimum came from** —
ADR-0033 already says so, and the row carries the pair rather than two
independent aggregates.

## Consequences

**The three reads are each other's tests.** A read that projects something
narrower will not typecheck against the card, which is the point: the contract
is enforced by the compiler and not by whoever reviews the third one.

**The reads themselves are not fixed here.** `/`'s _Novidades_ and the related
section own their own queries in their own issues; what they owe this ADR is the
shape they return. A fourth surface wanting a card inherits the row and adds
nothing to it.

**The card carries no rating**, although _melhor avaliados_ sorts by one. That is
`docs/STOREFRONT.md`'s card spec and not an oversight: `rating_average` is `0`
for every Product with no approved Review (ADR-0004), and printing a zero on
twenty-four cards is worse than printing nothing.

**Adding a field is a change to three queries**, which is the honest cost of one
shape and the reason to add one only when the card renders it. A field the card
does not use is a field two of the three reads will eventually stop populating
correctly.
