# 3. Orders snapshot the facts they depend on

Date: 2026-09-01

## Status

Accepted

## Context

An Order references data that keeps changing after the Order is placed. The
buyer edits their email in settings. An Admin corrects a Product name or
raises a price. A Customer deletes the address they moved out of. A Product is
archived when the supplier drops it.

Every one of those is a legitimate change to current data. None of them should
alter what a purchase from last March says.

Because there is no guest checkout, `order.user_id` is always present and the
buyer's details *could* simply be joined from `user` and `customer_profile`.
The address *could* be a foreign key to `address`. The line items *could* read
their names and prices through `product_variant`.

## Decision

They are copied instead. At the moment an Order is placed it snapshots:

- the buyer — `customer_name`, `customer_email`, `customer_document`
- the destination — the full shipping address as its own columns
- the delivery — `shipping_method_name`, `shipping_amount`, estimate
- the discount — `coupon_code`, `discount_amount`
- each line — `product_name`, `variant_name`, `sku`, `unit_price_amount`

Foreign keys to the live rows are kept alongside, for navigation. When the two
disagree, the snapshot is authoritative.

## Consequences

This is one principle, not several special cases — it is recorded here because
the duplication looks like a normalisation mistake, and a future reader with
good instincts will be tempted to "fix" it by replacing the copies with joins.
Doing so would silently rewrite history: past orders would show the current
price, the current name, the address the customer has since deleted.

It is also what makes deletion safe. An `address` row can be hard-deleted
without touching an Order. A Product can be archived without orphaning
anything. Only rows an Order navigates to are protected from deletion, and
they are protected for referential tidiness, not for correctness.

The price is storage — cheap — and the discipline of writing the snapshot at
exactly one point in the code. The checkout path is the only place allowed to
populate these columns, and nothing may update them afterwards.
