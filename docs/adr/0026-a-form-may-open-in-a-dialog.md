# 26. A form may open in a dialog

Date: 2026-09-07

## Status

Accepted

## Context

Every form in this codebase is a route. `/admin/products/new`,
`/admin/products/[id]`, `/admin/categories/new`, `/admin/categories/[id]` — a
navigation, a server component, a `requireAdmin()`, a prefetch, a form. That is
not a decision anyone took; it is what ADR-0011 makes cheap. *A query is
prefetched and hydrated if and only if a client component calls
`useSuspenseQuery` on it*, and a route is where the prefetch goes.

The Brands admin is the first surface where that shape buys nothing. A Brand is
a name and nothing else (`CONTEXT.md`; #67 and #69 emptied the row of `slug`,
`description` and `logoS3Key`), so its form is one text input. There is no tree,
no options query, no upload — and two stub `<h1>` routes at
`app/(admin)/admin/brands/new/page.tsx` and `.../[id]/page.tsx` that would have
to be filled in to keep the idiom.

The framing that started #68 — *every field the form needs is already in the
list row* — was rejected on the way here. It is checkable, and it is a symptom
rather than the rule: it describes what is true when the real condition holds,
and it gets the interesting case wrong. Categories could have widened its `list`
to carry `description` and `parentId` and met the letter of it, while remaining
a form that cannot possibly open in a dialog.

## Decision

**A form may open in a dialog when it reads nothing the list route has not
already hydrated, and when carrying what it edits does not turn the list into a
payload nobody reads.**

Two clauses. A form passes both or it is a route.

### The shape clause

**A dialog has no prefetch site.** It mounts on a click, not on a navigation, so
there is no server render at its mount where `prefetch` could run. Whatever the
dialog reads must therefore already have been hydrated by the surface it opened
from — which in practice means the list query, and nothing else.

The clause is mechanical, and it does the enforcing. What it forbids is a query
that is **not a function of the row already on screen**: an options set, a tree,
a sibling collection. Such a query has no route-level prefetch site *even in
principle*, because **the list route does not know which row the Admin will
open**.

**Counter-example: Categories.** It fails twice.

- `byId({ id })` is keyed by the row being edited.
- `parentOptions({ excludeId })` is keyed by the row being edited.

The second is the one that cannot be widened away. `parentOptions` is a set of
*other* rows, so no amount of extra columns on `list` reaches it. That is a hard
failure, not a judgement call, and it is why the categories form is a route and
would have been one even with a single field.

### The cost clause

The shape clause alone is self-fulfilling: any *row-scoped* field can be folded
into the list row until the letter of it is satisfied. So the second clause
prices that folding.

What it forbids is row-scoped data that would make the list a payload nobody
reads. It is a judgement call, and it is written as one — anchored to
ADR-0025's **bounded-set** property rather than to a row count, because a row
count is the thing ADR-0025 refused to invent.

**Counter-example: Products.** Variants and images are row-scoped, so the shape
clause alone would permit widening `list` to carry them. Fifty products carrying
every variant is a page of JSON shipped to render six columns, and the list is
paginated precisely because the set is unbounded. Products fails on cost.

Brands passes both, and passes the cost clause for the same reason #51 declined
pagination: a bounded set of narrow scalar fields.

| Clause | What it forbids | Counter-example |
| --- | --- | --- |
| **Shape** | a query that is not a function of the row — an options set, a tree | **Categories**: `parentOptions` is a set of *other* rows; no widening of `list` reaches it |
| **Cost** | row-scoped data that would make the list a payload nobody reads | **Products**: variants and images are row-scoped, and fifty rows carrying every variant is a page of JSON to render six columns |

### This does not violate ADR-0011

ADR-0011 rules that a query is prefetched and hydrated **iff** a client
component reads it. A dialog does not break that rule — it removes the
*affordance*. There is no second prefetch that goes unread and no read that goes
unprefetched; there is simply nowhere new to prefetch, which is why the shape
clause is stated as a condition on the dialog rather than as an exception to
ADR-0011.

### `list` widens, and the type carries the pairing

**One `list`, widened, with the form named in its docblock as its second
reader.** Not a second procedure: that would cost two round-trips' worth of code
for one round-trip's worth of data, and it would re-create the per-row query the
shape clause just forbade.

Widening is not itself new — `categories.admin.list` already carries `slug` and
`imageS3Key` for a thumbnail. What is new is over-fetching *to feed a form*, and
that is what this ADR licenses.

**The form's `defaultValues` types off
`RouterOutput["brands"]["admin"]["list"][number]`.** This half is load-bearing.
It makes a field the form adds and `list` forgot a **type error** rather than a
runtime blank field that saves an empty string over real data.

ADR-0011 admits this exact hazard about itself and leaves it open — *"the rule
is stated in terms of a call in a different file… nothing enforces the
pairing"*. Here the pairing between list and form is closed by the type system
instead of by a comment somebody has to remember.

### Never pass `keepMounted`

The primitive is Base UI (`@base-ui/react`), not Radix. `DialogPortal`'s
`keepMounted` defaults to `false`, and `components/ui/dialog.tsx`'s
`DialogContent` wraps `DialogPortal` without passing it. A closed dialog's
`Popup` — and the form inside it — is therefore **unmounted**: N rows cost N
unmounted portals, not N mounted forms, with no `useForm`, no hooks and no
queries among them.

That unmount is a correctness property, not only a cost argument, and it is what
makes the dialog a genuine peer of the route:

> Because the popup unmounts on close, the form remounts on every open, so
> `defaultValues` are re-read from the freshly invalidated list row each time.
> An abandoned half-edit does not survive to the next open.

A route form gets that for free by navigating. **So: never pass `keepMounted` to
a form dialog.** Passing it silently converts the form into a long-lived
component holding `defaultValues` from whenever it first mounted, and the bug
presents as a caching problem while being nothing of the kind. The prohibition
earns its words because `keepMounted` is exactly the prop someone reaches for to
fix an animation glitch.

For the same reason, closing on success is `setOpen(false)` and nothing else.
The unmount does the resetting; there is no `form.reset()`.

### What is given up

**The dialog is not addressable.** No `?novo`, no `?editar=<id>`, no
back-button close, no deep link. Open state is local.

This is a **cost, not an oversight**. The route form was linkable and
back-button-closable for free and the dialog is neither. URL state in this admin
exists so that reloading a sorted list reproduces it — nobody links a colleague
to a half-filled brand form — which is why the cost is affordable, not why it is
absent.

**This is the reopening trigger most likely to fire**, and it fires the moment
someone wants to link to a form.

### ADR-0006 is untouched

Deleting the two stub routes **removes two guard sites rather than creating an
unguarded surface**. The list page keeps its `requireAdmin()` and every write is
an `adminProcedure` (ADR-0012) — which is the posture ADR-0006 already states:
*"A page's check protects the page, not the data it happens to call."* A dialog
form shrinks the surface ADR-0006 governs.

### ADR-0023 is untouched

`providers/confirm-provider.tsx` **is** a `components/ui/dialog`, so a delete
confirm beside a form dialog is one modal primitive serving two purposes, not
two competing idioms. ADR-0023's reasoning — a delete is un-undoable from the
same screen, where archive and image removal are not — says nothing about how
create and edit render.

## Consequences

The component shape survives the move. **Three files, as in categories**:
`brand-form.tsx` holding the body, plus two thin wrappers each owning its own
`Dialog` chrome. No `mode` prop and no single dialog taking an optional row —
`category-edit-form.tsx` already refused that in as many words: *"a branch
inside one component would put a rule in a `.tsx`, and the two wrappers **are**
the branch."* No shared dialog shell either: the wrappers already own where the
Admin lands afterwards, which in a dialog becomes *the dialog closes*, and a
shell owning open state takes that job back and hands the wrapper a callback to
ask for it, in exchange for deduplicating a title and a footer.

**One dialog per row, mounted in `brand-row-actions.tsx`** beside the delete
confirm, mirroring `category-row-actions.tsx`. Affordable only because of the
unmount above; if that fact about the primitive ever changes, this placement is
the first thing to re-examine.

The two clauses fail differently and should be read that way. The shape clause
is checkable in review by pointing at the queries the form calls. The cost
clause is an argument, and an argument about a set — so it inherits ADR-0025's
weakness along with its premise: nothing enforces boundedness, and a list that
quietly stops being bounded invalidates this ADR's cost clause before anyone
notices the payload.

**This ADR is separate from ADR-0025 and depends on it.** They share the
bounded-set premise and reopen on different triggers: ADR-0025 when brands
outgrows one page, this one when **a form that passes both clauses today grows a
query keyed by its own row**. On that day the form goes back to a route, the two
stub pages come back, and `list` narrows again — in that order, because the
shape follows the surface.
