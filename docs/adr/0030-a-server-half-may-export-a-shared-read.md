# 30. A module's server half may export a shared read

Date: 2026-09-08

## Status

Accepted

## Context

ADR-0020 opened `modules/<name>/server/` to another module's `server/`, in
ADR-0009's direction, and it did so for one reason and one instance:
`recalculateProductRating` had to run inside the transaction that moderates a
Review, so a procedure could not be the seam. Its whole argument is atomicity.

Three modules now need the same import for a reason that has nothing to do with
atomicity. `cart`, `wishlist` and `checkout` all hold a foreign key to
`product_variant`, and all three must turn a set of Variant ids into something
renderable: the Variant, its Product's name, and its Cover.

The Cover is the problem. `CONTEXT.md` makes it **a position, never a flag** —
the image at position 0 among those bound to the Variant, falling back to the
Product's own. That is a rule about the catalogue, and ADR-0010 says procedures
query Drizzle directly, which read literally means `cart`, `wishlist` and
`checkout` each write their own version of it. Three copies of one rule, in
three modules that have no business knowing what a Cover is, and nothing that
tells you when they drift.

The alternatives were the ordinary ones. **A pure rule at the module root**, per
`docs/MODULES.md`, does not reach: picking a Cover is an `ORDER BY ... LIMIT 1`
against a table, not a function of already-fetched data. **A `products.shop`
procedure** each module calls is a second round trip, and inside
`checkout`'s transaction it is a second connection — the same objection ADR-0020
raised against a procedure, arriving by a different route.

## Decision

**A module's `server/` may export a query its dependents call, on the same terms
as a write: the rule belongs to the module whose vocabulary it speaks.**

`modules/products/server/lines.ts` exports `variantLines(tx, variantIds)`,
returning for each id the Variant, its price and stock, the Product's name and
slug, and the Cover key. `cart/server/`, `wishlist/server/` and
`checkout/server/` import it. It takes a transaction for the same reason
`rating.ts` does, so `checkout` can call it inside the one that creates an Order.

The gate is **`docs/MODULES.md`'s promotion gate, read for queries**: a shared
query earns its file when a second module needs it *and* it carries a rule its
owner owns. Both halves, as with a component. A query that is only a join two
modules happen to write the same way is not a rule and does not promote — each
writes its own, and ADR-0010 stands.

`lines.ts` is a file of its own, beside `rating.ts` and for the same stated
reason: it is not a procedure, it is a module-owned operation another module
calls, and it needs a name a stranger can find.

## Consequences

**ADR-0020 is generalised, not extended.** Its table of who may import what is
unchanged, and so is the graph — this ADR adds no edge that ADR-0009 and
ADR-0029 did not already permit. What changes is the *reason* the door is open:
ADR-0020 read as "atomicity may force a server-to-server import", and it now
reads as "a rule lives with its vocabulary, and some rules are queries."

**`server/` is now the third place a rule may live**, after the module root and
a `where` clause, and the line between them wants stating plainly:

| Where | What |
| --- | --- |
| module root, `<concept>.ts` | a pure function of already-fetched data — tested |
| `server/<concept>.ts` | a rule that must touch the database, called by more than one module — not tested (ADR-0017) |
| inside a query | a predicate with one caller |

The middle row is the new one and it is the one that will be abused. The
narrowness is the whole defence: **more than one module**, never merely more
than one procedure. A second procedure in the *same* module wanting the same
query is ADR-0010's `server/queries.ts`, which already exists and is not this.

The cost ADR-0020 named is now paid three times over: `variantLines`' return
shape is part of three modules' code, so widening it is a four-module change.
That is the coupling asked for — the alternative is three Cover rules that
nothing tells you have drifted, which is precisely the failure ADR-0004 and
ADR-0020 already refused once for the rating.
