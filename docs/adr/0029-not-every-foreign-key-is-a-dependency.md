# 29. Not every foreign key is a dependency

Date: 2026-09-08

## Status

Accepted

## Context

ADR-0009 makes a rule out of the schema: if module A's tables hold a foreign key
to module B's, A may import B, B may never import A, and there are no cycles.
Its strongest claim is that the graph "needs no list to maintain, because the
list already exists in `db/schema/`" — anyone can read the arrows off the
tables.

Drawing that graph for the nine unbuilt modules, for the first time, breaks it
in two places.

**A cycle.** `order.coupon_id → coupon.id`, so ADR-0009 permits `orders →
coupons`. ADR-0008 rule 1 gives Redemption to `coupons`, and
`coupon_redemption.order_id → order.id`, so `coupons → orders`. Both are real
foreign keys in `db/schema/commerce.ts` today. ADR-0009 says "no cycles, ever",
and this is one, sitting in the schema it told us to read.

**An ownerless table.** `cart.user_id`, `order.user_id`, `wishlist_item.user_id`,
`review.user_id`, `address.user_id` and `customer_profile.user_id` all point at
`user`. ADR-0008 gives `customers` the "User-as-person" and gives `auth` only
the sign-in and sign-up forms, while keeping Better Auth itself in the global
layer. Read literally, ADR-0009 then makes `cart`, `orders`, `wishlist` and
`reviews` all depend on `customers` — four wide edges bought by a column that
none of those modules ever reads through.

Both failures share a shape: a foreign key was read as a dependency when nothing
on either side ever reads the foreign row.

## Decision

**A foreign key creates a dependency only where the holding module reads the row
it points at.** Two kinds do not, and they are the two above.

**1. A snapshot foreign key is not a dependency.** Where ADR-0003 has already
copied every fact the holder renders, the key is provenance — a pointer back to
where a number came from — and the module never dereferences it. Three columns
in `order` are exactly this:

| Column | Snapshotted alongside |
| --- | --- |
| `coupon_id` | `coupon_code`, `discount_amount` |
| `shipping_method_id` | `shipping_method_name`, `estimated_delivery_days`, `shipping_amount` |
| `order_item.variant_id` | `product_name`, `variant_name`, `sku`, `unit_price_amount` |

An Order renders whole with all three targets deleted, which is why two of them
are `on delete set null`. So `orders` imports **nothing**: not `coupons`, not
`shipping-methods`, not `products`. That is ADR-0003 finally paying out — the
module charged with holding immutable history turns out to be a sink in the
graph, which is what immutable history should be.

The cycle goes with it. One arrow survives, `coupons → orders`, because a
Redemption genuinely reads its Order: the per-user and per-order limits
`CONTEXT.md` gives Redemption cannot be enforced without it.

**2. A foreign key to an infrastructure table is not a dependency.** `user` is
owned by Better Auth and by no module. ADR-0007 already puts session *shapes* in
the global layer and ADR-0008 keeps `lib/auth.ts` there with them; ADR-0006
fixes where a session is checked. A `user_id` reaches a procedure from
`protectedProcedure`, as an ambient value, and no module queries `user` to get
it. `customers` owns `customer_profile` and `address` — rows *keyed by* a User,
which is a different claim from owning the User.

The test that separates the two cases is one question: **does any code in the
holding module read the referenced row?** If it does not, there is no arrow.

The resulting graph, complete:

| Module | Imports |
| --- | --- |
| `brands`, `categories`, `shipping-methods`, `auth` | — |
| `customers` | — |
| `orders` | — (every outward key is a snapshot) |
| `products` | `brands`, `categories` |
| `cart` | `products` |
| `wishlist` | `products` |
| `coupons` | `orders` |
| `payments` | `orders` |
| `reviews` | `products`, `orders` |
| `checkout` | `cart`, `products`, `coupons`, `shipping-methods`, `orders`, `payments`, `customers` |

Acyclic, with `orders`, `customers` and the three leaf modules as sinks and
`checkout` importing seven and imported by none, exactly as ADR-0009 predicted
for a flow.

## Consequences

ADR-0009's central promise is **narrowed, not withdrawn**: the graph is still
read off `db/schema/`, but reading it now takes one more question per key rather
than none. That is a real cost, and it buys the only two things that made the
literal reading wrong.

The cost lands hardest on someone adding a column. A new foreign key is now a
judgement — snapshot or dependency — and getting it wrong in the permissive
direction adds an edge nothing notices. The mitigation is that snapshots are
visible: an ADR-0003 snapshot key always sits beside the columns it duplicates,
and a key with no duplicated columns beside it is a dependency.

**This ADR adds no arrow.** Every change it makes removes one, so no cycle it
could introduce exists, and `no-restricted-imports` stays a whitelist that only
shrinks.

The second rule generalises past `user`: any table the global layer owns and no
module does is invisible to ADR-0009. `user` is the only one today.
