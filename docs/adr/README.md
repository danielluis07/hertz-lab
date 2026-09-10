# Architecture decisions

One line per ADR. **Read this file, then open only the ADRs whose line touches
the area you are working in.** Every ADR is written to be readable alone; the
groups below are for finding them, not a reading order.

An ADR is never edited to reverse itself. Later ADRs *narrow* or *amend*
earlier ones and say so in their own text — so when two lines below look like
they overlap, the higher number carries the current rule.

## Domain and data model

- [0001](0001-product-variant-split.md) — Every Product sells through a Variant.
- [0002](0002-provider-agnostic-payments.md) — Mercado Pago behind a provider-agnostic Payment table.
- [0003](0003-orders-snapshot-their-facts.md) — Orders snapshot the facts they depend on.
- [0004](0004-denormalized-product-rating.md) — Product rating is denormalised.
- [0022](0022-the-category-tree-is-two-levels-deep.md) — The Category tree is two levels deep.
- [0023](0023-a-category-is-deleted-when-it-is-empty.md) — A Category is deleted when it is empty, and empty means both.
- [0029](0029-not-every-foreign-key-is-a-dependency.md) — Not every foreign key is a dependency.
- [0033](0033-a-products-shop-price-is-its-lowest-variant.md) — A Product's shop price is its lowest Variant's price.
- [0043](0043-a-category-path-is-a-canonical-subtree.md) — A Category path is a canonical subtree.
- [0051](0051-free-shipping-is-recorded-as-a-discount.md) — Free shipping preserves the delivery charge and records an equal discount.

## Modules and their boundaries

- [0008](0008-modules-are-aggregates-not-domains.md) — Modules are aggregates and flows, not domain groups.
- [0009](0009-foreign-key-direction-is-dependency-direction.md) — A foreign key's direction is the dependency's direction.
- [0010](0010-procedures-query-drizzle-directly.md) — A procedure queries Drizzle directly.
- [0017](0017-tests-follow-rules-not-layers.md) — Tests follow rules, not layers.
- [0020](0020-server-halves-import-in-fk-direction.md) — A module's server half is importable in the dependency's direction.
- [0024](0024-a-module-may-count-rows-that-point-at-it.md) — A module may count the rows that point at it.
- [0030](0030-a-server-half-may-export-a-shared-read.md) — A module's server half may export a shared read.
- [0038](0038-a-write-belongs-to-the-module-that-owns-the-table.md) — A write belongs to the module that owns the table.

## The global layer and page structure

- [0007](0007-global-layer-knows-shapes-not-rules.md) — The global layer knows shapes, never rules.
- [0015](0015-route-group-frames-are-authored-global.md) — Route group frames are authored global, not promoted.
- [0026](0026-a-form-may-open-in-a-dialog.md) — A form may open in a dialog.
- [0027](0027-the-storefront-owns-the-root.md) — The Storefront owns `:root`; the admin is the exception.
- [0042](0042-the-shop-frame-reads-its-nav.md) — The shop frame reads its nav; the admin frame declares it.

## The read path — see `docs/READ-PATH.md`

- [0011](0011-hydration-follows-what-the-client-reads.md) — Hydration follows what the client reads.
- [0014](0014-one-lenient-schema-parses-list-params.md) — One lenient schema parses URL search params into list input.
- [0016](0016-lists-compose-primitives-filters-are-declared.md) — Admin lists compose primitives; only the filter bar is declared.
- [0025](0025-a-bounded-list-declines-pagination.md) — A bounded list declines pagination and filtering.
- [0031](0031-cache-components-stays-off.md) — Cache Components stays off; the shop caches whole routes, not queries.
- [0032](0032-the-shop-hydrates-only-what-a-shopper-writes.md) — The shop hydrates only what a shopper's own write can change.
- [0035](0035-the-shop-prerenders-one-route.md) — The shop prerenders one route, and the filter bar is why.
- [0040](0040-loading-tsx-goes-where-the-route-is-dynamic.md) — `loading.tsx` goes where the route is dynamic, and nowhere else.
- [0041](0041-a-path-is-a-resource-a-query-string-is-a-view.md) — A path is a resource, a query string is a view.
- [0044](0044-the-filter-controls-are-shared-the-bar-is-not.md) — The filter controls are shared; the bar is not.
- [0045](0045-one-card-row-three-reads.md) — One card row, three reads.

## The write path — see `docs/WRITE-PATH.md`

- [0012](0012-every-write-is-a-trpc-mutation.md) — Every write is a tRPC mutation.
- [0013](0013-error-copy-is-layered-and-global-by-default.md) — Error copy is layered, and global by default.
- [0018](0018-images-upload-before-the-row-exists.md) — Images upload before the row exists, and orphans are tolerated.
- [0019](0019-aggregate-writes-reconcile.md) — An admin aggregate is written by one reconciling transaction.
- [0036](0036-a-write-invalidates-what-it-changes-on-the-shop.md) — A write invalidates what it changes on the shop, not what module it lives in.
- [0039](0039-the-checkout-transaction-is-ordered-by-its-locks.md) — The checkout transaction is ordered by its locks.
- [0050](0050-checkout-places-once-payment-retries-the-order.md) — Checkout places once; later Payment attempts continue against the Order.

## Auth, sessions and URLs

- [0005](0005-portuguese-public-urls.md) — Public URLs are Portuguese; admin and API URLs are English.
- [0006](0006-page-level-auth-checks.md) — Authorisation is checked in `page.tsx`, never in a layout.
- [0034](0034-the-shop-frame-resolves-the-visitor-on-the-client.md) — The shop frame resolves the visitor on the client.
- [0037](0037-the-cookie-cache-serves-display-never-authorisation.md) — The session cookie cache serves display, never authorisation.

## Images

- [0021](0021-square-images-and-the-browser-that-guards-them.md) — Photographs are square, and only the browser knows it.
- [0028](0028-the-hero-is-the-one-image-that-is-not-square.md) — The home hero is a committed asset, and the one image that is not square.
