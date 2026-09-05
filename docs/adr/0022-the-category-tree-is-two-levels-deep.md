# 22. The Category tree is two levels deep

Date: 2026-09-04

## Status

Accepted

## Context

`category.parent_id` is a self-reference with no depth bound. The column has
existed since the first migration, nothing has ever written it, and the browse
tree it describes has never had a form behind it. The Categories admin (#50)
is the first surface that lets an Admin choose a parent, so it is the first
thing that has to say what a parent *may* be.

An unbounded tree is the obvious reading of the column, and it brings one
obligation with it: **a cycle has to be refused.** A → B → A is expressible the
moment two Categories can each name the other, and the guard against it is an
ancestor walk — a recursive CTE, or a loop of reads, running on every `create`
and `update` that sets a parent. Re-parenting inherits the same walk from the
other side: moving a root that has a subtree drags the subtree with it, and the
depth of what arrives is not known until it has been walked.

Depth also leaks outward. Every reading surface an unbounded tree implies —
indentation, breadcrumbs, "products in this section and below" — is recursive
too, and `categories.admin.options` promises in its own docblock to know
nothing of the hierarchy precisely because a flat list of names is only
readable while the names are one level apart.

Three depths were live:

**Unbounded.** Maximum expressiveness, and it buys nothing this store has asked
for. The cost is the ancestor walk on the write path plus a recursive read on
every surface that ever renders the tree.

**One level (no nesting at all).** `parent_id` becomes dead weight and a
storefront that wants *Áudio → Fones de ouvido* has nowhere to put it. This is
the shape the column already contradicts.

**Two levels.** A Category is a **root** (`parent_id` null) or the **child** of
a root.

## Decision

**The tree is two levels deep. A Category is either a root or the child of a
root, and there is no third level.**

The bound is taken for what it makes *inexpressible*, not for what it forbids.
If a parent must itself be a root, then A → B → A cannot be written down at
all: B having a parent disqualifies it as one. The cycle guard stops being a
recursive walk hunting for a loop and becomes two ordinary reads. That is the
whole argument; the storefront shape (*Áudio → Fones de ouvido*) is a
confirmation, not the reason.

Three refusals enforce it, written on `create` and `update`:

1. A Category may not be its own parent.
2. The chosen parent must itself be a root.
3. A Category that already has children may not take a parent.

Rule 3 is re-parenting refused from the other end: a root with a subtree is
refused a parent rather than dragging its children down to a third level. A
child moves freely between roots, a child is promoted by clearing the field,
and a childless root is demoted freely.

**Nesting is a recorded browse-shape fact and nothing more.** No admin rule
walks ancestry beyond the guard that protects the tree itself: ADR-0021 already
refused picture inheritance, the delete rule (ADR-0023) counts only *direct*
children, and the admin list is one flat fetch. Descendant counts, indentation
and "everything below this section" belong to the surfaces that render them.

**Any Category may hold Products, children or not.** Leaf-only is enforceable
and is a rule with no caller: nothing is made wrong by a root holding both
Products and children, and the rule would put a second refusal on the *Product*
write path, teaching that module the tree. "A parent shows only its children's
products" is a query, not a constraint.

## Consequences

The bound is asymmetric in the direction that makes it safe to take now.
**Relaxing it later is a rule change with no data migration behind it** — every
existing root/child pair still validates under three levels — while tightening
one later is a data problem, because the rows that violate the new bound already
exist and something has to decide where they go. The cheap direction is the one
left open.

The refusals live in the procedures rather than in a pure function, which is a
deliberate exception to `docs/MODULES.md`'s *if it can be a pure function of
already-fetched data, it must be one*. All three need a read — (2) reads the
proposed parent's row, (3) counts children — so a pure `canBeChildOf` would hold
`id !== parentId` and otherwise be handed the rows the procedure just fetched,
making its test a test of the fetch. ADR-0017 is satisfied by testing the rules
through the procedures instead, which in this repo means they are not unit
tested at all; that cost is ADR-0017's and is recorded there.

A second procedure, `parentOptions(excludeId?)`, returns roots only.
`categories.admin.options` cannot serve a parent picker: it lists children,
which cannot be parents, and it lists the Category being edited. Keeping the
filter in a procedure is what lets `options` keep its promise to know nothing of
the tree — filtering client-side would mean the form re-deriving "is a root"
from data `options` does not carry.

The parent field is **never disabled**. A Category with children still renders
an enabled Select and is refused by the procedure, because the form does not
encode a rule the server owns and a Category can gain a child between render and
save.

The reopening trigger is a merchandising need for a third level that a person
can actually name — not the observation that the column would allow one.
