# 51. Free shipping is recorded as a discount

Date: 2026-09-10

## Status

Accepted

## Context

The Order stores `subtotalAmount`, `discountAmount`, `shippingAmount` and a
generated `totalAmount = subtotal - discount + shipping`. A Coupon may be
percentage, fixed amount or free shipping.

ADR-0039 named `couponDiscount(coupon, subtotal)` as the pure checkout rule.
That signature cannot represent free shipping honestly. Setting
`shippingAmount` to zero produces the right total, but erases the selected
Shipping Method's normal charge; setting both shipping and discount to zero
also leaves the receipt unable to show what the Coupon saved.

A separate shipping-discount column would preserve both facts, but the existing
formula already has the two terms it needs and this effort permits no schema
migration.

## Decision

**A free-shipping Coupon snapshots the Shipping Method's normal charge in
`shippingAmount` and the same value in `discountAmount`.**

The generated total therefore adds and subtracts the same charge. The immutable
Order retains both the delivery price and the saving that removed it.

ADR-0039's pure rule is narrowed to
`couponDiscount(coupon, subtotal, shippingAmount)`. Percentage and fixed-amount
Coupons continue to discount the merchandise subtotal; free shipping returns
the selected Shipping Method's charge.

## Consequences

One `discountAmount` remains the complete monetary effect of the one applied
Coupon, regardless of its type. The receipt can render subtotal, discount,
shipping and total without consulting the deleted or edited Coupon later.

The authoritative quote must know the selected Shipping Method before it can
apply a free-shipping Coupon. Changing Shipping Method while a Coupon is applied
therefore re-quotes on the server.

`shippingAmount` now means the delivery charge before the Order-level Coupon,
not necessarily the amount added to the final total. That distinction is the
price of retaining both facts without another column and is recorded here so a
future reader does not "correct" one side to zero.
