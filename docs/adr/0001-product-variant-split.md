# 1. Every Product sells through a Variant

Date: 2026-09-01

## Status

Accepted

## Context

Hertz Lab sells audio and electronics, where the same Product routinely comes
in several sellable forms: headphones in black or silver, speakers in two
finishes, cables in 1 m / 2 m / 3 m. Each form has its own SKU, its own stock,
sometimes its own price and its own photographs — but shares one name, one
description, one Brand and one Category.

Three shapes were considered:

1. **Flat Product.** One row is one sellable thing; "WH-1000XM5 Preto" and
   "WH-1000XM5 Prata" are two unrelated Products.
2. **Product + Variant, always.** Product carries the marketing copy; Variant
   carries SKU, price, stock and dimensions. Every Product has at least one.
3. **Optional Variants.** Price and stock live on Product, with a nullable
   Variant table for the Products that need it.

## Decision

Option 2. `product_variant` is the only sellable unit in the system.
`cart_item` and `order_item` reference a Variant and never a Product. A
single-form Product still gets exactly one Variant.

## Consequences

Option 3 is the one this decision is really rejecting, because it is the one
that looks cheapest. Making Variants optional pushes a conditional into every
consumer of the Catalog: every price lookup, every stock check, every cart
line and every query has to answer "does this Product have Variants?" first.
That ambiguity cannot be contained — it leaks into the storefront, the admin,
and every future report. Making Variants mandatory answers the question once,
in the schema.

Option 1 was rejected because it makes a coherent product page impossible: a
colour switcher needs to know that two rows are the same Product, and
duplicated descriptions drift apart the first time someone edits one.

The cost is real and paid daily: displaying a Product always requires loading
its Variants, and a single-Variant Product carries one row of pure ceremony.
"From R$ X" pricing on listing pages needs an aggregate over Variants rather
than a column read.

Reversing this later would mean rewriting every cart, order and catalog query
in the application. It is the most expensive decision in the schema to change,
which is why it is recorded here.
