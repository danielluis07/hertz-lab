# 50. Checkout places once; Payment retries the Order

Date: 2026-09-10

## Status

Accepted

## Context

ADR-0039 fixes the transaction that turns a Cart into an Order and puts the
provider call after its commit. That order is necessary: a remote payment
request must never hold the Cart, Coupon and Variant locks. It also means a
provider rejection is learned after the Order exists, stock has been reserved,
the Coupon has been redeemed and the Cart has been emptied.

The surface still had three related decisions to make. Checkout could be a
route per step, one route with a client-only stepper, or one form. The result
could live in local state, in the existing immutable Order receipt, or at a
durable completion URL. Finally, a failed payment could replay checkout,
compensate the whole transaction, or create another Payment against the Order.

There is no Checkout aggregate or persisted draft, and this effort permits no
schema migration. A routed wizard would therefore carry unfinished Address,
Shipping Method, Coupon and payment selections in browser state while implying
that each URL was independently recoverable. A local stepper keeps the hidden
state without gaining addressability.

The Order receipt has the opposite lifetime. It is immutable history and its
existing contract deliberately reads the latest safe Payment summary without
polling, provider payload or retry. Turning it into the payment workspace would
make one route own both a durable receipt and an active provider session.

## Decision

**Checkout places an Order exactly once. Payment completion continues against
that Order and never replays checkout.**

`/checkout` is one route with one final placement form. It has no routed steps
and no persisted draft. It composes Customer identity, a saved Address, an
active Shipping Method, an optional applied Coupon, the authoritative quote,
the Order review and Mercado Pago's embedded Payment Brick.

After `checkout.place` commits, the route replaces navigation with
`/checkout/[id]`. This second route is not another form step: its path addresses
the Order that now exists. It is the durable owner of provider status,
Pix/boleto completion instructions, bounded pending-state polling and Payment
retry. `/minha-conta/pedidos/[id]` remains the immutable receipt and links from
the completion surface rather than absorbing it.

Mercado Pago remains behind the provider-agnostic Payment table (ADR-0002).
Provider-specific browser code and response adaptation live in `payments`;
raw `providerPayload` never crosses to a component. The provider request uses
the internal Payment id as its idempotency key, so retrying that request cannot
create a second provider charge for one Payment row.

An approved or refunded Payment is terminal. A provider-backed pending Payment
is observed and may not have a concurrent attempt. A rejected, cancelled or
provider-uninitialised attempt may be followed by a new Payment for the same
`pending_payment` Order, with any supported method. That write touches no Order,
Cart, stock or Redemption fact.

There is no automatic unpaid-Order expiry in this effort. Reserved stock and
Coupon usage remain until payment succeeds or the Order is cancelled through
the existing Order transition.

If the browser loses the `checkout.place` response, it refetches the Cart. A
non-empty Cart means the placement did not consume it and the form remains
usable. An empty Cart is an ambiguous outcome: the surface neither resubmits nor
guesses at the newest Order, and instead directs the shopper to Order history.

## Consequences

The Storefront has twenty routes rather than nineteen. `proxy.ts` protects the
whole `/checkout/:path*` subtree, and both pages still call `requireUser()` as
the real guard.

One placed Order may have several Payment rows. That was already legal in the
schema and is now intentional rather than incidental. The Order's
`pending_payment` status describes the purchase while each Payment status
describes one attempt; neither substitutes for the other.

The embedded Brick keeps card details out of Hertz Lab while preserving the
in-store flow. It is provider-specific UI, not provider-specific storage.

The cost is explicit: a shopper can leave an unpaid Order reserving inventory
and Coupon capacity until cancellation. Automatic expiry would require a
separate operational policy and scheduled execution, so it is a fresh effort
rather than an invisible clause in a route build.

The ambiguous-response recovery is deliberately conservative. Without a
persisted client-known placement key, there is no safe way to infer which Order
a failed browser request created. Order history is one extra step and cannot
place twice or disclose the wrong purchase.
