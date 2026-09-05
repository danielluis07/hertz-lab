# 23. A Category is deleted when it is empty, and empty means both

Date: 2026-09-04

## Status

Accepted

## Context

Nothing in this application deletes a row that a shopper has ever seen. A
Product archives (`CONTEXT.md`: *a Product is never deleted*), because Orders
still refer to it; a Cart is emptied, never deleted; `docs/MODULES.md` records
that `delete` is a reserved word and, in this domain, usually a lie. A reader
who knows that rule and meets `categories.admin.remove` will reasonably ask why
a Category is the exception.

It is the exception because **nothing in Order history refers to a Category**.
ADR-0003 snapshots what an Order needs onto the Order itself, and a Category is
not among what it takes: it is a browse node, and a browse node nobody browses
to has no reason to survive. Archiving one would add a status to the only
catalog entity whose whole purpose is navigation, and give the admin list a
filter for a state no surface would ever render.

So the question is not whether a Category deletes, but **when it is allowed
to**, and the schema gives two different answers to two different relationships:

- `product.category_id` is `on delete restrict`. The database refuses.
- `category.parent_id` is `on delete set null`. The database **silently
  promotes** the children to roots.

Left alone, deleting a Category with Products produces an uncaught database
error, which ADR-0013 turns into `INTERNAL_SERVER_ERROR` and the global tier
renders as *"algo deu errado"* — exactly the silence that ADR spent a decision
eliminating. And deleting a Category with children changes the shape of the
browse tree underneath an Admin who asked to remove one node, with nothing
marking the displaced children.

The children had three live answers: promote them to roots (what the FK already
does), re-parent them to the deleted Category's own parent, or refuse the delete
outright.

## Decision

**A Category is deleted rather than archived, and only when it is empty.
Empty means both: no Products, and no child Categories.** The Admin empties a
branch from its leaves upward.

**Both refusals are pre-checked in `remove`, not left to the database.** The
procedure counts the Products in the Category and throws a pt-BR `CONFLICT`
naming the number — *"Não é possível excluir: 12 produtos estão nesta
categoria."* The count is what earns the pre-check: it tells the Admin the size
of the job before they go and do it, where a caught FK violation could only say
that there were some. It counts direct children and refuses those the same way.

**Children are refused, not promoted and not re-parented.** Both alternatives
mutate the browse tree invisibly, and refusing is what makes *empty* mean one
thing — the word `docs/DATA-FLOW.md` already used by hand ("a procedure that
genuinely deletes a row, such as an empty Category") and the word the refusal,
that table and `CONTEXT.md` now all lean on.

**Both foreign keys stay exactly as they are.** `on delete restrict` on
`product.category_id` becomes the backstop for the race where a Product is
assigned between the count and the delete. `on delete set null` on
`category.parent_id` becomes a backstop the rule never lets fire.

**The delete confirms**, through the existing `ConfirmProvider`. This is not a
reversal of `docs/PRODUCTS-ADMIN.md`'s refusal of confirmation dialogs but the
same reason applied to a different fact: that module confirms nothing because
nothing it does is un-undoable from the same screen — archive is reversible by
filtering, removing an Image is a field edit (ADR-0018). Deleting a Category is
neither.

**The picture goes after the row.** The S3 object behind `image_s3_key` is
deleted once the row delete has committed, and a failed delete never throws.
This is ADR-0018 applied unchanged, in both halves: `client.delete` cannot roll
back, so the object goes after the row is gone rather than inside the write; and
the orphan a failure leaves is the one ADR-0018 already tolerates, where leaving
the object behind on success would be a *guaranteed* orphan on the one path
where we can see it happening.

## Consequences

**A live column's behaviour is deliberately unreachable, and this file is why.**
A reader of `db/schema/catalog.ts` finds `onDelete: "set null"` on `parent_id`
and will conclude that deleting a parent promotes its children. They will be
wrong, because the rule above the schema never lets that path execute. Removing
the clause to match the rule was rejected: as a backstop it costs nothing and it
is the correct behaviour if the rule is ever relaxed.

**The rule stays in the procedure; there is no pure `isRemovable`.**
`docs/MODULES.md`'s test earned `modules/products/status.ts` because
`isPublishable`/`isArchivable` encode a transition table with a second caller —
the row that decides which buttons exist. Here the rule's whole content is *both
counts are zero*, and the `Excluir` button always renders, so **no client ever
asks it**. Extracting it would obey the letter of the test with an empty file.

**The button is never hidden or disabled for a non-empty Category.** The
refusal is strictly more informative than its absence: *"12 produtos estão nesta
categoria"* is a work order, a greyed-out button is a puzzle. This is
`ProductRowActions`' own argument for its half-rule, applied where it is
stronger.

**Deleting a Category is a two-step job for the Admin**, and deliberately: to
remove a section they must first move or delete every Product in it, then every
child. That is the cost of never mutating the tree behind their back, and it is
paid by the admin list, which carries both counts as columns so the refusal is
visible before an Admin walks into it.

The reopening trigger is a Category that turns out to be referenced by something
that outlives it — a saved search, a marketing campaign, an Order. Then the
Product rule applies to Categories too, and this ADR is superseded rather than
amended.
