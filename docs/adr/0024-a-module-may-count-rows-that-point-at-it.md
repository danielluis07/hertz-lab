# 24. A module may count the rows that point at it

Date: 2026-09-05

## Status

Accepted

## Context

ADR-0009 fixes which way a dependency may point, and it settles the case in this
ADR's title by name. Among its two worked examples:

> A Category page needs a product count. That would be `categories` importing
> `products`, upward. The page composes both instead — the count comes from a
> `products` procedure the Category page calls alongside the tree.

Its Consequences repeat the ruling and accept the cost:

> A Category page that wants counts makes two calls where one would have done.
> That is the rule working: the alternative is `categories` knowing what a
> Product is, and there is no version of that which stops at counts.

Two later decisions arrived that the example was written before.

**ADR-0023** makes the Product count a *rule* rather than a decoration: a
Category is deleted only when it is empty, and the admin list "carries both
counts as columns so the refusal is legible before an Admin walks into it". The
number is no longer something a page displays; it is the thing that explains a
refusal.

**#59** makes the count *sortable*. "Nº de produtos" is one of three columns an
Admin can order the list by, and ADR-0014's schema puts the sort in the URL.

The second is what breaks the prescribed remedy. A count fetched by a second
call arrives *after* the rows are chosen and ordered; it cannot be a term in the
`ORDER BY` that produced them. "Compose at the page" therefore buys the boundary
at the price of either sorting in the browser — a second sorting implementation,
which #59 refuses for its own reasons — or paginating on one query and ordering
by another, which is not a thing SQL will do. The remedy was correct for the
surface ADR-0009 imagined, which only displayed the number.

Three ways out were considered.

**Denormalise, as ADR-0004 did for the rating.** A `product_count` column on
`category`, maintained by every write that moves a Product between Categories.
This is the shape the repo already owns and it would sort perfectly. It buys a
sortable column with a permanent invariant: a counter that four write paths must
remember, that silently drifts when one forgets, and that ADR-0004 accepted only
because a rating is read on every product card in the shop. This count is read
by one admin table.

**Keep the two calls and sort in the browser.** Refused by #59 on grounds that
have nothing to do with module boundaries: a client-side comparator has to know
which columns are text and which are numbers, and would sit beside a
`buildSortHref` that already exists.

**Say what the rule was always about.**

## Decision

**A module may read another module's table to count the rows that point at its
own, in the direction ADR-0009 forbids an import. It may read nothing else of
that table.**

`categories.admin.list` counts `product` rows whose `category_id` is the
Category on the row:

```ts
const productCount = sql<number>`(${db
  .select({ value: count() })
  .from(product)
  .where(eq(product.categoryId, category.id))})::int`;
```

ADR-0009's concern is stated in its own Consequences: "the alternative is
`categories` knowing what a Product is, and there is no version of that which
stops at counts." The first half is right and the second half is the part this
narrows. What `categories` learns here is **how many rows hold a key to this
one** — a fact about the Category, read through the foreign key that already
points this way, and one the `product` table happens to store. It imports no
`products` code, names no Product field but the key aimed at it, and would be
unchanged by every column that table will ever gain. A module that read
`product.status` to count only the live ones would have crossed the line, and
`product.price` to sum them would be over it entirely.

The direction is unchanged and so is the graph: `product.category_id → category.id`
is the same arrow that lets `products` import `categories`, and nothing new
points back. The rule stays readable off `db/schema/`, which was ADR-0009's
whole reason for keying on foreign keys.

**Where the count is not a term in a query, ADR-0009's remedy still stands.** A
page that only displays a number composes two calls, because it can, and this
narrowing is not a general licence to reach across.

## Consequences

ADR-0009's second worked example is superseded and should be read with this ADR
beside it. Its first — the Product rating, denormalised by ADR-0004 — is
untouched, and the two now mark the ends of a range: a number read on every
product card in the shop earns a maintained column, a number read by one admin
table earns a subquery, and only the middle is worth arguing about.

The cost is that the boundary is no longer answerable by grepping imports alone.
`modules/categories/server/admin.ts` imports `product` from `@/db/schema` and no
lint rule distinguishes that from any other table it might read, so the limit
above — a count of inbound keys, and nothing else — is documented and not
enforced. That is the same class of guarantee as ADR-0010's "procedures query
Drizzle directly", and it fails the same way: in review, by reading the query.

The narrowing is deliberately about `count`, not about joins. A `leftJoin`
against `product` that pulled a name or a price into a Category row would be
`categories` knowing what a Product is in exactly the way ADR-0009 refuses, and
nothing here permits it.
