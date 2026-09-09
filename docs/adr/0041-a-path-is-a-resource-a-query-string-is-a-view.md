# 41. A path is a resource, a query string is a view

Date: 2026-09-09

## Status

Accepted

## Context

`docs/DATA-FLOW.md` fixes absence for admin in two rules: `null` means "this
resource does not exist" and becomes a `notFound()`; `[]` means "nothing
matched" and renders an empty state. It is emphatic that **a list always
succeeds** — `/admin/products?categoryId=<gone>` shows an empty list, "a filter
is a *view* of a list, not a resource, and the admin's fix is to clear the
filter, which an empty state invites and a 404 does not."

The shop breaks that rule's implicit assumption, in both directions.

**Upward.** The catalogue addresses a Category in the **path**,
`/produtos/[...categoria]`, while its filters stay in the query string. So one
page must produce both absences in a single render:
`/produtos/audio/fones?marca=<gone>` is a real Category with a dead filter, and
`/produtos/nao-existe?marca=<real>` is the reverse. "A list always succeeds"
would make both an empty catalogue; ADR-0033 already went the other way for an
archived Product, on the reasoning that an addressable thing is a resource.

**Downward.** `cart.user_id` is `not null unique` and ADR-0034 left no guest
Cart, so a signed-in shopper who has never added anything **has no `cart` row**.
Read literally, `null` from `cart.get` is "this resource does not exist" and
`/carrinho` returns a 404 to every new account — obviously wrong, and the kind
of wrong that ships because each rule is individually correct.

`CONTEXT.md` had already settled the second one and nobody had noticed: a Cart
is "the single, **permanent** collection of Variants a User intends to buy. One
Cart per User; it is emptied, never deleted." A permanent, per-User collection
cannot be absent. The glossary was right and the read path disagreed with it.

## Decision

**What distinguishes the two absences is where the thing is addressed, not what
kind of thing it is.** A path segment names a resource, and a resource that is
not there is a 404. A query string names a view over a list, and a view that
selects nothing is an empty state. `DATA-FLOW.md`'s `null`/`[]` rule is the
consequence of this, not the statement of it.

Applied:

- **`/produtos/[...categoria]` 404s on the segment and empty-states on the query
  string**, in the same file. A bad Category is `notFound()` (soft, per
  ADR-0040); a dead `marca`, an empty price band or a `busca` matching nothing
  is an empty catalogue with a 200. `/produtos` itself never 404s.
- **`/produto/[slug]`** stays ADR-0033's hard 404 for archived or unknown.
- **`cart.get` never returns `null`.** It returns an empty Cart whether or not
  the row exists, so `/carrinho` sees `[]` like every other list. It does **not**
  create the row: a read that writes would let a crawler on `/carrinho` mint
  rows and would collide with ADR-0039's lock ordering. The row is created by
  the first add.

**A Cart is not a resource a shopper can address — it is a property of the
shopper.** `/carrinho` addresses the shopper, and the shopper exists. This is
why its absence is emptiness and never a 404, and it generalises: the Wishlist
is the same shape and the schema already says so — `wishlist_item` carries "One
implicit list per User, so there is no parent wishlist row", so it is always
`[]` and never had this problem. The Cart's parent row is a storage detail that
must not reach the read path.

**An empty personal list points at the catalogue.** The Cart, the Wishlist and
the order list all render an empty state whose action is a link to `/produtos`;
a filtered catalogue's action clears the filters. **The spec names the action;
`DESIGN.md` and the building agent write the words** — `docs/STOREFRONT.md`
already assigns "the wording of an empty state" to whoever builds the surface,
and where a stranded shopper goes next is a route decision, not a taste one. An
unfiltered catalogue with no results is not a state to design: an empty store is
a seed problem.

## Consequences

`docs/DATA-FLOW.md`'s absence section is **narrowed, not superseded**, following
the pattern of ADR-0029 and ADR-0034: its two rules stand for admin exactly as
written, and gain the clause that says which one applies. Admin never needed the
distinction because it addresses every resource by an `[id]` segment and every
view by a query parameter, so the two rules already lined up with this one.

`cart.get`'s no-`null` contract narrows ADR-0032's procedure surface and pays
off twice. ADR-0034 has the header badge read `trpc.cart.get` with `select` and
render nothing until the count is non-zero; a nullable result would have forced
every consumer — badge, `/carrinho`, checkout — to handle two different empties,
and a `select` returning `undefined` versus `0` is exactly the silent
disagreement ADR-0034 rejected a second query key to avoid.

`CONTEXT.md` gains one clause making the existing "permanent" explicit against
the shape the database has, since that is where the two disagreed.
