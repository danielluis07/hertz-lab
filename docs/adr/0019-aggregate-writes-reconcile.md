# 19. An admin aggregate is written by one reconciling transaction

Date: 2026-09-03

## Status

Accepted

## Context

ADR-0016 settled that a Product is edited by **one form firing one mutation**.
A Product is not one row: it is a `product` row plus at least one
`product_variant` (ADR-0001), plus `product_image` rows whose upload already
happened (ADR-0018), plus `product_specification` rows. So `create` and `update`
each receive a whole aggregate and have to turn it into writes across four
tables.

The obvious implementation of `update` is **replace**: delete every child row
for the Product, insert the array that arrived. One code path, no diffing, no
ids on the wire.

It is illegal here, and the schema says so:

- **`order_item.variant_id` is `onDelete: "restrict"`.** A Variant that appears
  on any Order cannot be deleted. Replace-all therefore makes every Product that
  has ever sold uneditable — the failure arrives in production, on the rows that
  matter most, and never in development against fresh data.
- **`cart_item.variant_id` is `onDelete: "cascade"`.** Deleting a Variant in
  order to re-insert it silently empties that line out of every shopper's Cart.
  Renaming "Preto" to "Preto Fosco" would drop the item from carts.
- `product_image.variant_id` points at Variant ids. Churning those ids on every
  save breaks the link between a photograph and the Variant it shows.

The second problem is narrower and only exists on create. ADR-0018 has an image
tile naming the Variant it belongs to — but on create the Variants have no ids
yet, so the tile holds the Variant's **index** in the form's array and the write
resolves it. Read literally, that makes the create payload and the update
payload different shapes, which would mean two schemas and a form body whose
values type is a union of them.

## Decision

**`update` reconciles by id; it never replaces. The form speaks array indices,
never database ids, for the image-to-variant link — on create and update
alike.**

Concretely:

- Every child array element carries `id: z.string().optional()`. **Absent means
  insert; present means update the row with that id; an id the client did not
  send back means delete.** `create` receives the same schema and ignores any id
  it is sent.
- **Deleting a Variant that an Order references is refused**, before the write,
  with a real pt-BR `TRPCError`:

  ```ts
  throw new TRPCError({
    code: "CONFLICT",
    message: "Esta variação já foi vendida e não pode ser removida.",
    cause: { field: "variants" },
  });
  ```

  ADR-0013's `errorFormatter` lifts that `field`, so the form renders it and the
  global toast stands down.
- **`product_image.variantId` is a number on the wire** — the index of the
  Variant in the form's `variants` array, or `null` for a shot of the Product as
  a whole. The transaction resolves index to id after the Variants are settled,
  which it can do in both directions because reconcile has just told it the id
  of every row in the array.
- **Specifications replace-all**, and that is not an inconsistency. Nothing
  references a specification row, so neither foreign-key hazard applies — and
  they carry a `(product_id, label)` unique index, which reconcile actually
  *fails* on: swapping two labels writes the first before deleting the second
  and violates the constraint. Delete-then-insert inside the transaction is both
  simpler and more correct here.
- The whole of it runs in **one `db.transaction`**. There is no partial state to
  design for, which is the protection ADR-0017 named when it refused to test
  this procedure.

**Status is not in this payload.** A Product's `status` moves through
`products.admin.publish` and `products.admin.archive` — `docs/MODULES.md`'s
domain-verb rule — so the form edits what a Product *is* and never what it
*does*.

## Consequences

The write is more code than replace-all, and all of the extra code is the part
that keeps sold Products editable. That trade is not close.

**One schema, one form body, two thin owners.** Because the wire shape is
identical on both pages, `product-form.tsx` renders the fields once and
`product-create-form.tsx` / `product-edit-form.tsx` differ only in which hook
they fire and where they navigate. The index-not-id choice is what buys this: an
image tile does not change meaning between the two routes.

The cost of indices is that they are **positional**, so the array order is
load-bearing during a submit in a way ids would not be. This is contained by the
fact that ADR-0018 already derives `position` from the array index — the form
was already an ordered structure, and nothing new is being asked of it.

`id?` on a child element is a shape the client can lie about: a caller could
send an id belonging to another Product. **Every reconcile is scoped by
`productId`**, so a foreign id matches no row and is treated as an insert rather
than as a cross-aggregate write.

**This generalises past products.** Any admin module whose form edits child rows
follows it — the template in `docs/MODULES.md` states it as the rule, not as a
products anecdote. Today products is the only such module, which is why this ADR
is written from it.

The one thing not decided here is what happens to the S3 object behind an Image
that reconcile deletes. ADR-0018 already answered it: the `update` that drops
the key deletes the object as part of the write.
