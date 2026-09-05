# 9. A foreign key's direction is the dependency's direction

Date: 2026-09-02

## Status

Accepted

## Context

ADR-0008 fixes what a module *is* and names thirteen of them, and closes by
noting that cross-module reads "become ordinary and frequent" — `products`
reading option lists from `brands`, `checkout` reading four modules, `payments`
telling `orders` a payment cleared. It sets no direction on that traffic.

Without one, thirteen modules that may all import each other are not thirteen
modules. The first cycle arrives the day someone puts a product count on a
Category page, and after that the boundary exists only in the folder names.

Three rules were considered.

**Free-for-all.** Any module imports any other's public surface. Costs nothing
to state and nothing to follow, which is the problem: it has no failure mode
anyone notices until the graph is already a mesh.

**A shared kernel.** A `modules/_shared` holding the types two modules both
need. This is the standard escape hatch and it is a trap here: the kernel has no
owner, so every hard call gets resolved by moving the disputed thing into it.
ADR-0007 already refused that shape for `lib/`.

**Layers.** Declare tiers — catalog below commerce below flows — and forbid
upward imports. Correct in spirit, but the tiers are a second thing to maintain
and to argue about, and nothing in the repo tells you which tier a new module
joins.

## Decision

**If module A's tables hold a foreign key to module B's, A may import B's public
surface. B may never import A's. No cycles, ever.**

The rule needs no list to maintain, because the list already exists in
`db/schema/`. Asking which way a dependency may run is the same question as
asking which table holds the key, and anyone can answer it by reading the
schema.

The direction it produces matches the domain without being tuned to it:
`brands` and `categories` sit below `products`; `products` below `reviews`,
`wishlist` and `cart`; `customers` below `orders`; `orders` below `payments`;
`checkout` sits below almost everything. `payments` imports `orders` to report
that a payment cleared, and `orders` stays ignorant of Mercado Pago — which is
what ADR-0002 wanted an adapter for in the first place.

**Where two modules appear to need each other, that is the signal a route should
compose them** (ADR-0008, rule 4), not that the rule needs an exception. Two
cases the codebase already answers this way:

- A Product needs its average rating. `products` may not import `reviews`, and
  does not have to: ADR-0004 denormalises `rating` onto Product.
- A Category page needs a product count. That would be `categories` importing
  `products`, upward. The page composes both instead — the count comes from a
  `products` procedure the Category page calls alongside the tree.

`checkout` owns no table, so the rule appears not to reach it. It does, by the
same reading: a flow module sits below everything it reads and above nothing.
Nothing may import `checkout`.

## Consequences

The boundary is now checkable by reading two files, and the one violation that
actually costs something — a cycle — is hard to write without noticing.

The cost is that some data assembly moves up into routes that would have been
shorter as a single cross-module import. A Category page that wants counts makes
two calls where one would have done. That is the rule working: the alternative
is `categories` knowing what a Product is, and there is no version of that which
stops at counts.

The rule is also silent on the shape of the traffic it permits — how `checkout`
actually reaches four modules is a data-flow question, specified separately. All
this fixes is which way an arrow may point.

**Narrowed by ADR-0024.** The second worked example above — a Category page
wanting a product count, composed from two calls — is superseded. ADR-0023 made
that count a rule rather than a display, and #59 made it sortable, and a count
that arrives from a second call cannot be a term in the `ORDER BY` that chose
the rows. ADR-0024 lets a module count the rows that hold a key to its own, in
this ADR's forbidden direction, and permits nothing else of that table. No new
arrow, no new cycle risk. Where a count is only displayed, the remedy above
still stands.

**Extended by ADR-0020.** This ADR fixes which way an arrow may point; it was
silent on whether the traffic it permits may reach a module's `server/` folder,
which `docs/MODULES.md` had made private without exception. ADR-0020 says it
may, in this ADR's direction and only between two `server/` folders. The graph
is unchanged — no new edge, no new cycle risk — and is still readable off
`db/schema/`.
