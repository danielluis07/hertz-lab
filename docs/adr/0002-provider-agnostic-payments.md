# 2. Mercado Pago behind a provider-agnostic Payment table

Date: 2026-09-01

## Status

Accepted

## Context

Hertz Lab is a Brazilian storefront, so checkout has to offer PIX, boleto and
cartão de crédito. Stripe has better developer ergonomics but weak native
support for exactly those three in Brazil; Mercado Pago is the market default
and supports all of them directly.

Whichever provider is chosen, the integration is asynchronous: the browser
does not learn that a PIX transfer cleared, a webhook does. Webhook delivery
is at-least-once. Providers retry on timeout, retry on non-2xx, and
occasionally deliver the same event twice for no reason at all.

## Decision

Model Mercado Pago, but keep the `payment` table provider-agnostic: a
`provider` string, a `provider_payment_id`, a `method` enum
(`pix` | `credit_card` | `boleto`), a `status` enum, an amount, and a nullable
`provider_payload` holding the raw body.

Record every webhook in `payment_webhook_event`, keyed unique on
`(provider, provider_event_id)`.

## Consequences

The webhook table is the part that looks like over-engineering, so it is worth
stating plainly what it prevents: without it, a duplicated `payment.approved`
event marks an Order paid twice, decrements stock twice, and — once loyalty or
refunds exist — pays out twice. The unique key turns idempotency into an
insert that either succeeds or conflicts, rather than application logic that
has to reason about its own history. This is the difference between a real
integration and a demo, and it is one table.

`provider_payload` as raw JSON means a provider that adds a field does not
require a migration to capture it, and a disputed transaction can be
reconstructed from what the provider actually sent rather than from what our
parser kept.

Keeping the table provider-agnostic is deliberately cheap insurance, not a
prediction. It does not make switching providers free — statuses and methods
differ between them — but it keeps the provider's vocabulary out of the column
names, so a switch is an adapter rather than a migration of historical rows.

Order status and Payment status stay separate. They are two different facts and
a single column would have to lie about one of them; see `CONTEXT.md`.
