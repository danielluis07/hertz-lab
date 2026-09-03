# 8. Modules are aggregates and flows, not domain groups

Date: 2026-09-02

## Status

Accepted

## Context

`docs/CONVENTIONS.md` promises `modules/<name>/` for "everything that knows a
rule", and ADR-0007 fixes what may sit above modules in `lib/` and `hooks/`.
Neither says what a module *is*, and the codebase offered three groupings that
disagreed:

- **The admin routes** are per-entity: `brands`, `categories`, `products`,
  `coupons`, `customers`, `orders`, `reviews`, `shipping-methods`.
- **The db schema** is grouped by domain: `catalog.ts`, `commerce.ts`,
  `content.ts`, `customer.ts`, `auth.ts`.
- **`CONTEXT.md`** groups its vocabulary the same way as the schema: Catalog /
  Buying / After the sale / People.

The schema grouping is less symmetrical than it looks. `catalog.ts` holds six
tables, `content.ts` holds one, and `commerce.ts` holds ten spanning five
unrelated aggregates — the cart, shipping methods, the coupon engine, orders
and the payment provider. Mirroring those files would produce one module with
nothing in it and one that owned most of the store.

Entity-per-table was ruled out just as quickly: Variant, Image and
Specification have no surface of their own. They are edited inside the Product
form and have no life without it.

## Decision

**A module is one owner of one coherent slice of behaviour behind one public
surface — usually an aggregate root, sometimes a flow.**

Four rules follow.

**1. The unit is the aggregate root.** Sub-entities with no independent life
live inside their root: `products` owns Variant, Image and Specification;
`orders` owns OrderItem and status history; `coupons` owns Redemption. The
boundary is the thing someone manipulates on one screen.

**2. Flows may be modules.** `checkout` owns no table and spans five other
modules, and it is still a module, because the flow's rules have to belong to
something. A module may own zero routes.

**3. Audience is a second axis, applied only where both audiences exist.**
`modules/products/admin/` and `modules/products/shop/`, with the entity's own
vocabulary — schemas, statuses, types — at the module root. `checkout` and
`shipping-methods` serve one audience each and get no subfolders. This keeps
`productSchema` in one place while letting two audiences with disjoint queries,
disjoint components and even disjoint URL languages (ADR-0005) stay apart.

**4. Routes compose modules; they never own logic.** Many routes map onto one
module (`/admin/products`, `/new`, `/[id]`), and one route may compose several
(`produtos/[...categoria]` reads the tree from `categories` and the grid from
`products`; the product form reads option lists from `brands` and
`categories`). A `page.tsx` composes and nothing more. What is forbidden is the
reverse: one route's logic split across two modules that both claim it.

A corollary that decides several edge cases on its own: **schema file location
does not determine module ownership.** `db/schema/*` stays grouped as it is —
that grouping is a Drizzle concern. Banning a Customer is owned by
`customers/admin/` even though `banned` is a column in `db/schema/auth.ts`.

### The modules

Thirteen, app-wide. The eight admin route groups map 1:1 onto modules.

| Module | Owns | Admin | Shop |
| --- | --- | --- | --- |
| `products` | Product, Variant, Image, Specification | yes | yes |
| `brands` | Brand | yes | yes |
| `categories` | the Category tree | yes | yes |
| `coupons` | Coupon, Redemption | yes | yes (applied at checkout) |
| `shipping-methods` | Shipping Method | yes | yes (quoted at checkout) |
| `orders` | Order, OrderItem, status history | yes | yes (`minha-conta/pedidos`) |
| `payments` | Payment, webhook event, provider adapter | no | no (webhook only) |
| `customers` | User-as-person, profile, Addresses | yes | yes (`perfil`, `enderecos`) |
| `reviews` | Review | yes (moderation) | yes (write, read) |
| `cart` | Cart, CartItem | no | yes |
| `checkout` | the flow | no | yes |
| `wishlist` | WishlistItem | no | yes |
| `auth` | sign-in and sign-up forms and their schemas | no | yes |

Module names are plural, matching the admin route segments.

Four boundaries in that table were close calls and are recorded as such:

- **`payments` is split from `orders`.** ADR-0002 exists to keep the provider's
  vocabulary behind an adapter; an adapter with a raw `provider_payload`, an
  idempotency table and a webhook route handler is a module boundary in
  everything but name. Folding it into `orders` would put Mercado Pago's
  payload shape inside the module ADR-0003 charges with snapshotting order
  facts.
- **`auth` owns becoming a session; `customers` owns the person.** Login,
  cadastro, password and verification are `auth`. Profile, Document, phone,
  addresses, the admin list and banning are `customers`.
- **`addresses` folds into `customers`**, having no surface that is not a
  customer surface. **`wishlist` does not**, because folding it in would make
  the person-module own a relationship to Variants.
- **`cart` is separate from `checkout`.** `CONTEXT.md` makes a Cart permanent
  ("emptied, never deleted") while checkout is transient. One module cannot
  honestly own both lifetimes.

Better Auth's configuration and session helpers (`lib/auth.ts`,
`lib/auth-utils.ts`) stay in the global layer as infrastructure. That is
consistent with ADR-0007: a session check knows the *shape* of a session, and
ADR-0006 already fixes where it is called.

## Consequences

The boundary is now drawable without reading this file: ask what single thing a
user manipulates, and whether it survives on its own. Product does; Variant does
not.

The cost is that no single grouping in the repo agrees with the module list —
`db/schema/`, `CONTEXT.md` and `modules/` are three different cuts of the same
domain, and that will read as an inconsistency to anyone who has not read this.
It is deliberate. Schema files group by storage, `CONTEXT.md` groups for a human
reader, and modules group by ownership of behaviour. Only the third is a code
boundary.

Cross-module reads become ordinary and frequent — `products` reading option
lists from `brands`, `checkout` reading four modules, `payments` telling
`orders` a payment cleared. That traffic is the price of narrow modules, and it
makes each module's public surface the thing that matters most; that surface is
specified separately.

The thirteen are fixed app-wide, but only the admin halves are specified in
detail by the current effort. The shop halves are named here so that no later
work has to redraw the boundary to add them.
