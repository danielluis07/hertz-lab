# Context

The shared vocabulary of Hertz Lab. Every term here means exactly one thing in
code, in issues, and in conversation. This file is a glossary — it holds no
implementation detail, no schema, and no decisions. Decisions live in
`docs/adr/`.

## People

**User** — an authenticated identity. Owned by Better Auth. A User may be an
`admin`, who administers the store and never shops.

**Customer** — a User who has shopped. Not a table of its own: a Customer is a
User that has acquired the commerce facts a purchase requires (fiscal document,
phone). *There is no Customer without a User* — Hertz Lab has no guest checkout.

**Admin** — a User with the `admin` role. Manages the Catalog, moderates
Reviews, and fulfils Orders.

**Document** — the Brazilian fiscal identifier a Customer must supply: a CPF
for a person, a CNPJ for a company. One Document belongs to one User; it is
what makes a User a Customer, together with a phone.

## Catalog

**Product** — the marketing entity a shopper reads about: name, description,
Brand, Category. A Product is never bought directly. A Product is **draft**
(being written, invisible to shoppers), **active** (on sale) or **archived**
(withdrawn from sale, kept because Orders still refer to it). *Publishing* and
*archiving* are the Admin's two acts on that fact; a Product is never deleted.
An **active** Product has at least one Image — a shopper cannot evaluate one
that has never been photographed — so publishing an imageless Product is
refused. A draft may be imageless: the description often precedes the photo
shoot.

**Variant** — the sellable unit: its own SKU, price, stock, and dimensions.
Every Product has at least one Variant, even when there is only one thing to
buy. Carts and Orders always reference a Variant, never a Product.

**Brand** — the manufacturer of a Product (Sony, Sennheiser, JBL).

**Category** — a node in the browse tree. Categories nest, and the nesting is
**two levels deep**: a Category is either a *root* or the child of a root, and
there is no third level. A Category may carry one picture of its own —
decoration for the browse surfaces, never a photograph of anything for sale, and
never inherited by its children. That picture is *not* an Image. Categories have
no inherent order: nothing about a Category is carried by where it sits in a
list, so the order of any list of them belongs to the surface that renders it.

A Category is deleted, not archived: nothing in Order history refers to one, so
a dead browse node has no reason to survive. Only an **empty** Category — one
holding no Products and no child Categories — may be deleted; the Admin empties
a branch from its leaves upward.

**Image** — a photograph of a Product, stored in S3 and referenced by key. An
Image may belong to one Variant, or to the Product as a whole. Images are
ordered, and that order is what the shop renders.

**Cover** — the first Image in a Product's order: the one photograph that
stands for the Product wherever it appears as a single picture — the catalogue
grid, a cart line, a link preview. A Cover is a *position*, never a flag, so
reordering the Images is what changes it.

**Specification** — one labelled row of a Product's technical sheet
("Impedância", "32 Ω"). Descriptive text for the shopper, not a filter facet.

**Aggregate** — a Product together with the rows that only exist as part of it:
its Variants, its Images and its Specifications. The Aggregate is the unit an
Admin edits and the unit that is written — one form, one save, one transaction —
and nothing inside it is addressable on its own. Brand and Category are *not*
part of it: they are referenced, and they outlive any Product that names them.

**Slug** — the words that identify a Product, a Brand or a Category in a public
URL. A Slug is unique, it is chosen rather than derived, and it is not a name:
renaming the thing leaves the Slug alone, because a Slug that changes breaks
every link that was ever shared.

## Buying

**Money** — every amount in Hertz Lab is Brazilian reais expressed in *cents*,
a whole number. There is no other currency and no fractional cent. A Coupon's
percentage is the one exception to "a number is cents": a percentage is
*basis points*, where 1000 means 10%.

**Cart** — the single, permanent collection of Variants a User intends to buy.
One Cart per User; it is emptied, never deleted. A Cart reflects *current*
prices at all times.

**Order** — a purchase that has been placed. An Order is immutable history:
what it records stays true no matter what later changes in the Catalog.

**Snapshot** — a value copied onto an Order at the moment it is placed —
the buyer's name, the shipping address, a Product's name and price — so the
record still describes what actually happened after the source changes. When
Order data and Catalog data disagree, the Order is right.

**Coupon** — a discount a shopper applies by entering a code. Coupons apply to
an Order as a whole, never to individual Products or Categories.

**Redemption** — one use of a Coupon by one User on one Order. Redemptions are
what enforce a Coupon's usage limits.

**Shipping Method** — a named delivery option with a carrier, a cost, and an
estimate (PAC, SEDEX). The chosen one is snapshotted onto the Order.

**Payment** — an attempt to collect the money for an Order, tracked against a
payment provider. An Order's status and a Payment's status are separate facts:
the Order describes the purchase, the Payment describes the money.

## After the sale

**Review** — a rating and written opinion of a Product. A Review requires a
*verified purchase*: it is always linked to the delivered Order that entitles
its author to write it. Reviews are moderated before they appear.

**Wishlist** — the Variants a User has saved for later. One implicit list per
User; saving is an act, not an object.
