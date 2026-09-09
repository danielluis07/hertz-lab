# 38. A write belongs to the module that owns the table

Date: 2026-09-09

## Status

Accepted

## Context

ADR-0030 opened `modules/<name>/server/` to another module's `server/` for
shared **reads**, and it put a deliberately narrow gate on the door: a query
earns its own file when **a second module needs it** *and* it carries a rule its
owner owns. The narrowness was the whole defence — "more than one module, never
merely more than one procedure."

The checkout write (#102) is the first thing to cross that door in the other
direction, and read literally the gate refuses it.

One transaction turns a Cart into an Order, and it writes seven modules' tables:
`customer_profile` (`customers`), `product_variant.stock_quantity`
(`products`), `order` / `order_item` / `order_status_history` (`orders`),
`coupon_redemption` (`coupons`), `payment` (`payments`), `cart_item` (`cart`).
`checkout` is the **only** caller of every one of them, and will remain so —
ADR-0029 puts `checkout` at the top of the graph, importing seven modules and
imported by none. So ADR-0030's first condition, *a second module needs it*, is
failed by all seven, and the literal reading says `checkout` should write all
seven tables itself.

That reading contradicts the precedent ADR-0020 actually set.
`recalculateProductRating` has exactly one caller — the reviews module's
moderation — and it lives in `modules/products/server/rating.ts` anyway, for a
reason its own file states plainly: *"it writes a `product` row, so it must not
live in `reviews`."* Caller count never entered that argument.

Both readings cannot be right, and the difference is not academic. It is the
difference between `orders` being a module and `orders` being a schema file that
`checkout` writes through.

## Decision

**ADR-0030's two-module gate governs shared reads. It does not govern writes. A
write to a table belongs to the module that owns that table, whatever the caller
count.**

So the checkout transaction is orchestration and nothing else — a body of named
calls, each into the `server/` of the module whose vocabulary the write speaks:

| Write | Lives in |
| --- | --- |
| `customer_profile` insert-if-absent | `customers/server/profile.ts` |
| `product_variant.stock_quantity` decrement | `products/server/stock.ts` |
| `order` + `order_item` + first `order_status_history` | `orders/server/place.ts` |
| `coupon_redemption` insert | `coupons/server/redeem.ts` |
| `payment` insert | `payments/server/create.ts` |
| `cart_item` delete | `cart/server/empty.ts` |

Each takes a `Transaction` for the reason `rating.ts` and `lines.ts` already do:
the caller needs it atomic, so a procedure cannot be the seam.

**The asymmetry between reads and writes is the point, and it has a reason.** A
read another module writes for itself is at worst a duplicated join — ugly, and
ADR-0010 accepts it. A *write* another module performs for itself is a second
place that knows a table's invariants, and nothing tells you when the two
disagree. `order_item` must be a complete ADR-0003 snapshot; a
`coupon_redemption` may not exist without the Order it points at; an `order` is
invalid without its first history row. Those are `orders`' and `coupons`'
rules, and a rule enforced from outside the module that owns it is a rule with
no home.

The test is one question, and it is the same question ADR-0029 asks about
foreign keys, pointed the other way: **whose table is being written?** That
module owns the function. Caller count is not consulted.

## Consequences

**ADR-0030 is narrowed, not superseded** — the pattern ADR-0029 set with
ADR-0009. Its gate, its table of who may import what, and its central worry
(that `server/` is the row most likely to be abused) all stand for reads,
unchanged. What this ADR says is that the gate was only ever about reads,
because a read is the only kind ADR-0030 was looking at.

**Six files exist to be called once each, and that is accepted.** It is the
visible cost, and it buys the thing a single fat `checkout/server/place.ts`
cannot: a stranger asking "what happens to stock when something sells" finds
`products/server/stock.ts` by looking in `products`, which is where they will
look.

**The graph is unchanged.** Every edge this implies —
`checkout → customers, products, orders, coupons, payments, cart` — is already
in ADR-0029's table, and this ADR adds none. `orders` stays a sink:
`place.ts` receives every snapshot as data and dereferences no foreign key.

**The rule that will be abused is the mirror of ADR-0030's.** Someone will
promote a *read* on ownership grounds because this ADR made ownership sound
like the universal test. It is not: a read with one caller stays in the caller,
per ADR-0010, and the checkout transaction demonstrates both halves — it writes
through six modules' `server/` while querying `shipping_method`, `address` and
`cart_item` inline, because those are reads it alone needs.

**`server/` may now hold a function with one caller.** ADR-0030's defence
against a bloated `server/` was the two-module count, and for writes that
defence is gone. What replaces it is ownership, which is a stricter test in the
direction that matters: it does not ask whether a function is *popular*, it asks
whether it is in the right module, and it forbids the file that would otherwise
grow — a `checkout/server/` that knows six other modules' invariants.
