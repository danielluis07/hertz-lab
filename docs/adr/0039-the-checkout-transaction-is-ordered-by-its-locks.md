# 39. The checkout transaction is ordered by its locks

Date: 2026-09-09

## Status

Accepted

## Context

One transaction turns a Cart into an Order. It is the only place in Hertz Lab
where five modules write together, and the only write a shopper performs that
another shopper can contend with: two people can hold the last unit of a
Variant in their Carts, and the same Coupon can be at its final use in two
checkouts at once.

ADR-0029 puts `checkout` above seven modules, ADR-0030 gives it
`variantLines(tx, ids)` to snapshot with, and ADR-0038 says each write belongs
to its table's owner. None of them says what order any of it happens in, and
the order is load-bearing three separate times:

- `coupon_redemption.order_id` is `not null`, so a Redemption cannot be written
  before its Order exists. ADR-0029 kept `coupons → orders` as the one surviving
  arrow for exactly this.
- A Coupon's per-user limit is a count of rows that a concurrent checkout is
  also inserting. Checked outside a lock, two transactions each see the limit
  unreached and both insert.
- Stock decrements take row locks on `product_variant`. Two checkouts over
  overlapping Carts that take them in different orders deadlock, and the
  ordering they take them in is whatever order `cart_item` happened to return.

`docs/MODULES.md` gives no guidance here because nothing built so far has more
than one contended row. The admin transactions (ADR-0019) are single-Admin
writes over one aggregate.

## Decision

**The transaction acquires every lock it will need, in one fixed global order,
before it writes anything.** Reads and validation first, all writes after.

```
  1  cart               SELECT … WHERE user_id = … FOR UPDATE
  2  cart_item          re-read; empty → CONFLICT
  3  coupon             SELECT … WHERE code = … FOR UPDATE   (only when a code was sent)
     coupon_redemption  count global and per-user, under that lock
  4  variantLines(tx, sortedVariantIds)            ← ADR-0030
     a line whose Variant is gone, or whose Product is not active → CONFLICT
  5  shipping_method    re-read by id; inactive → CONFLICT
  6  PURE  couponDiscount(coupon, subtotal) · orderTotals(lines, discount, shipping)
     result ≠ expectedTotalAmount → CONFLICT, naming the changed lines
  7  address            re-read by id; assert it belongs to this User
  ──────────────────── every lock is held; nothing below fails on contention ────
  8  ensureCustomerProfile(tx, …)      customers
  9  decrementStock(tx, sortedLines)   products
 10  createOrder(tx, …)                orders     order + order_item[] + first history row
 11  redeemCoupon(tx, …)               coupons    needs order.id
 12  createPayment(tx, …)              payments
 13  emptyCart(tx, cartId)             cart       deletes cart_item; the cart row survives
```

Four things in that sequence are decisions rather than consequences.

**The cart lock is the double-submit guard.** Step 1 is `FOR UPDATE` on a row
that is `not null unique` per User (ADR-0034 established there is no guest
Cart), so it serialises one shopper against themselves. A second submission
blocks until the first commits, then re-reads an emptied `cart_item` at step 2
and fails `CONFLICT`. This is why the Cart is emptied *inside* the transaction
rather than after it. The alternative was an idempotency key, which is a column,
and the tables are complete.

**Prices are re-read and the total is re-checked, never trusted.** `cart_item`
carries no price by ADR-0003 and a Cart reflects current prices, so the quote a
shopper saw is not a fact the commit can rely on. Step 4 is the same read that
produces the `order_item` snapshot, so the re-price costs nothing extra; what
costs something is step 6, which compares against an `expectedTotalAmount` the
client sends and **aborts** when they disagree rather than charging the fresh
price silently. Charging more than the displayed figure without a re-confirm is
the failure this exists to prevent. `expectedTotalAmount` is procedure input,
not a column.

**Stock is decremented by a conditional update over sorted ids.** Each line is
`UPDATE product_variant SET stock_quantity = stock_quantity - :q WHERE id = :id
AND stock_quantity >= :q`, and a `rowCount` of 0 is the sold-out signal.
Sorting the ids is what makes concurrent overlapping Carts queue instead of
deadlock, and it is the single most deletable line in the whole transaction —
it looks like tidiness and it is correctness. The `>= 0` check constraint on
`product_variant` stays as a belt: reaching it means this rule was bypassed, and
a `23514` is the right way to find that out.

**The buyer snapshot comes from the session, not from `user`.**
`order.customerName` and `customerEmail` live on Better Auth's table, which
ADR-0029 rule 2 makes invisible to every module. `protectedProcedure` already
holds them as an ambient value, and ADR-0037 makes that value fresh —
`getCurrentSession()` opts out of the cookie cache — so the snapshot is
current without anyone reading `user`.

**Everything that is not a database write happens after the commit.** The
`payment` row is inserted `pending` with a null `provider_payment_id`; the
provider is contacted afterwards and the row updated by id, which is what the
nullable column and its partial unique index were built for (ADR-0002). Holding
seven modules' locks open for a payment provider's latency is not a trade-off,
it is a bug. Then `revalidatePath('/produto/' + slug)` runs **once per distinct
Product** in the Order, per ADR-0036 — distinct because two Variants of one
Product are one page, and after the commit because invalidating for a
transaction that then rolls back is a lie. `/` is deliberately not invalidated:
Novidades is newest-active, and ADR-0033 prices a Product off
`min(variant.price_amount)`, which a stock decrement does not move.

**Every failure is `CONFLICT`.** Zod owns shape, so `BAD_REQUEST` never
applies; all seven are the same thing said differently — the state disagrees
with what the shopper was shown.

| Failure | `cause.field` |
| --- | --- |
| empty cart | — |
| a line's Variant is gone, or its Product is not active | `items` |
| the total moved | `items` |
| out of stock | `items` |
| Coupon invalid, expired, or over limit | `couponCode` |
| Document held by another User | `document` |
| Shipping Method inactive | `shippingMethodId` |

ADR-0013's `errorFormatter` lifts `field`, so `/checkout` renders each against
its own control rather than a global toast.

The procedure is **`checkout.place`** on `protectedProcedure`, in
`modules/checkout/server/place.ts`. `place` is the domain verb — `CONTEXT.md`
defines an Order as "a purchase that has been placed" — and there is **no
audience folder**, because `docs/MODULES.md` rule 2 gives those only to modules
that have both audiences, and checkout has one.

## Consequences

**A Coupon serialises every checkout that uses it.** Step 3's `FOR UPDATE` on
one `coupon` row is what makes `max_uses` and `max_uses_per_user` enforceable at
all — `CONTEXT.md` says Redemptions are what enforce a Coupon's limits, and a
count is only true under the lock that will insert. The cost is that a
successful campaign coupon becomes a queue. Accepted, and named so nobody
mistakes it for an accident: the alternative is a Coupon that oversells, which
is money.

**`ensureCustomerProfile` is insert-if-absent and never updates.**
`CONTEXT.md` makes a Customer a User who has acquired a Document and a phone,
created lazily at first checkout, and this is that transaction. But a Document
is identity, and `checkout.place` silently rewriting a profile is a procedure
doing a second job; `/minha-conta/perfil` owns edits. Two consequences follow:
`/checkout` asks for Document and phone **only when the profile is absent**, and
a Document already held by another User arrives as a `23505` on
`customer_profile.document`'s unique index, caught and rethrown as `CONFLICT`
with `cause: { field: "document" }`. It is not pre-checked with a `SELECT` —
that is a race the unique index already wins.

**The first `order_status_history` row is written inside `createOrder`, not
beside it.** `order.status` defaults to `pending_payment`, so the row is
redundant to state but not to history, and a history that begins at the *second*
status forces every later reader to special-case its absence. Writing it inside
`createOrder` rather than as its own step means no caller can produce an Order
without it. `changed_by_user_id` is the shopper: they placed it, and the column's
own comment reserves null for the system.

**Nothing enforces the lock order.** It is a comment and this ADR, the same
posture ADR-0035 took on what keeps `/produto/[slug]` static. A CI assertion
would have to model concurrency to be worth anything, and the honest mitigation
is that the sequence is short, in one file, and reads top to bottom.

**Steps 4, 5 and 7 are reads `checkout` performs itself**, inline, because
ADR-0010 keeps a read with one caller in its caller and ADR-0038 is explicit
that ownership promotes writes only. The transaction therefore demonstrates
both halves of that rule in one function, which is the clearest place anyone
will find them.

**`order.number` needs nothing.** It is
`generatedAlwaysAsIdentity({ startWith: 1000 })`, so no step generates it and no
lock protects it.

**This decides the inside of the transaction only.** What `/checkout` renders
when a `CONFLICT` comes back, how many routes the flow has, and where the
shopper lands afterwards are #95's, and this ADR is an input to it.
