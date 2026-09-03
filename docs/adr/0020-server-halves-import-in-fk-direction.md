# 20. A module's server half is importable in the dependency's direction

Date: 2026-09-03

## Status

Accepted

## Context

Two rules that were written apart meet for the first time on the Product rating,
and as written they contradict each other.

**ADR-0004** denormalises `product.rating_average` and `product.rating_count`,
and is emphatic about how they are maintained: every write path that approves,
rejects or removes a Review recalculates **in the same transaction**, and
"there is no second place allowed to touch these columns."

**`docs/MODULES.md`** makes `modules/<name>/server/` private — importable only
by the module's own server code and by `trpc/routers/_app.ts` composing it — and
that privacy is *enforced*, by a `no-restricted-imports` rule, not merely
documented.

The recalculation is a write against a `products` table. It is therefore not a
pure rule and cannot live at the module root, where `docs/MODULES.md` puts
everything another module may import. And the module that must trigger it is
`reviews`, which under ADR-0009 is allowed to depend on `products` — the foreign
key runs `review.product_id → product.id` — but which cannot reach
`products/server/`.

Three ways out were considered.

**`reviews` writes the columns itself.** It has the transaction and the review
rows; a dozen lines of SQL and the problem disappears. This is the option ADR-0004
explicitly forbids: the rule for maintaining Product data would then live inside
`reviews`, and the second module that needs it (a repair routine, an import) gets
its own copy.

**`products` exposes a procedure `reviews` calls.** A procedure is a second
transaction, so the recalculation could not be atomic with the moderation. That
is the one property ADR-0004 asked for by name.

**Loosen the rule.** Let `reviews/server/` import `products/server/`.

## Decision

**A module's `server/` folder may be imported by another module's `server/`
folder, in the direction ADR-0009 already permits. Nothing outside a `server/`
folder may import one.**

The `no-restricted-imports` rule narrows accordingly: the guard is on the
*importer's* location, not only on the path being imported.

| Importer | May import `modules/x/server/*` |
| --- | --- |
| `modules/x/**` | yes |
| `modules/y/server/**`, where ADR-0009 permits `y → x` | **yes** — this ADR |
| `modules/y/server/**`, where ADR-0009 does not | no |
| anything outside a `server/` folder (`app/`, `components/`, a module's `admin/`) | no |
| `trpc/routers/_app.ts` | yes, to compose routers |

The first and only instance today: `modules/reviews/server/admin.ts` imports
`recalculateProductRating(tx, productId)` from
`modules/products/server/rating.ts`, and calls it inside the moderation
transaction. The trigger belongs to `reviews`; the rule belongs to `products`.

`rating.ts` is a file of its own rather than a function inside
`products/server/admin.ts`, because it is not an admin procedure — it is a
module-owned write that another module calls, and it needs a name a stranger can
find.

## Consequences

**What the `server/` boundary was actually for is unchanged.** It exists to keep
`server-only` code — the S3 client's secret key, `db`, Better Auth internals —
out of client bundles, and to fail at lint time with the name of the offending
import rather than at build time with the name of a leaf file. A server file
importing another server file threatens neither. The rule was absolute because
until now nothing had a reason for it not to be, and an absolute rule is a
cheaper thing to write than a correct one.

**ADR-0009 does all the constraining.** This ADR adds no new direction and no
new cycle risk; it only says that the traffic ADR-0009 already permits may be
server-to-server. The permitted graph is still readable off `db/schema/`.

The cost is that a module's server half is no longer a sealed box, so a change
to `recalculateProductRating`'s signature is now a change to `reviews` too. That
is a real coupling, and it is the coupling ADR-0004 asked for: the alternative
was two implementations of a derived column that nothing tells you have drifted.

The narrowing carries a rule that is easy to lose: **a module's `admin/` and
`shop/` folders are not `server/`.** They render in the browser, so they still
cannot import any `server/` file, their own included. The lint rule keys on the
importing file's path, which is what makes that check mechanical.

ADR-0004's "a recalculation routine that can rebuild both columns for a Product
from scratch should exist from the start" is satisfied by this file and nowhere
else. It is written to take a transaction, so a future repair script calls the
same function.
