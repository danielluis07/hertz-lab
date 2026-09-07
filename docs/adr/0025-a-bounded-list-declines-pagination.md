# 25. A bounded list declines pagination and filtering

Date: 2026-09-07

## Status

Accepted

## Context

Eight admin surfaces get a list. ADR-0016 settled how one is *authored* — the
table is markup the module owns, the filters are data rendered by one shared bar
— and in doing so it described the parts as though every list had them: a search
box, a few filters, sortable headers, a paginated table. Seven of the eight do.

**Categories does not**, and that was decided rather than overlooked. #51 ruled
the categories list a single unpaginated, unfiltered fetch of every row, sorted
in the query from the URL: ADR-0014's params schema kept, `SortHeader` and
`buildSortHref` kept, `FilterBar`, `PaginationNav` and the search box all
refused. Its argument for the refusals was one sentence — *a filter that narrows
a list you can already see in full is decoration* — and the browser's own Ctrl+F
is what a debounced search box would have been, without the round trip, on a
table that carries no `tsvector` to search anyway.

#51 declined to mint an ADR from that. It recorded the rule in the spec and set
a gate: *"becomes an ADR when brands is the second caller."* #50 carried the
debt forward by name when it ruled the Brands admin out of the categories map's
scope. That is ADR-0007's tie-breaker applied literally — **promote on the
second caller, never on the first** — and this is the second caller. Brands is
tens of manufacturers, declining pagination and filtering for exactly the reason
categories did, and the rule now has two instances rather than one anecdote.

**Two refusals along the way shaped what this ADR may say.**

#54 refused a **count cap** — a guard that would fail, warn, or paginate when
the row count crossed some N. Its reasoning is the reasoning this ADR inherits:
every other refusal in that module protects meaning, a count cap would protect a
rendering assumption, and any N is invented. There is no honest number. Six
hundred categories would be a broken admin surface long before any threshold
fired, and the thing that broke would be the domain, not the table.

#54 also refused a `Criado em` column on the grounds that *products carries it
because a paginated 500-row list needs "what's new"; this list is seen whole* —
the same property being read a third time, for a different decision. It was
doing real work in three tickets before anyone named it.

## Decision

**A list whose set is bounded may decline pagination and filtering. It may not
decline sorting.**

### What makes a set bounded

Not a row count. A bounded set is one where all three hold:

1. **It is enumerated by an Admin.** Every row exists because a member of staff
   sat down and made it. No shopper, no import, no integration and no background
   job adds to it.
2. **It grows by deliberate acts**, one at a time, at the speed of someone
   deciding the catalog needs another one.
3. **Nothing in the domain makes it large.** There is no mechanism — not demand,
   not time, not traffic — that drives the count up. The set is the size the
   business is.

Applied:

| Set | Bounded | Why |
| --- | --- | --- |
| Categories | yes | An Admin names the shelves the store has |
| Brands | yes | An Admin names the manufacturers the store carries |
| Products | **no** | The whole point of the store is that this grows |
| Customers | **no** | Grown by strangers, from outside |
| Orders | **no** | Grown by strangers, and by time, and never pruned |

Customers and Orders fail hardest, and fail differently from Products: their
growth is not even under the store's control. That distinction is worth keeping
in view, because the tempting misreading of this ADR is *"the list is small
today"* — a set of forty Customers on launch day is not bounded, it is early.

### Narrowing is refused; ordering is kept

The distinction the refusals turn on is between **narrowing** a set and
**ordering** one.

A `FilterBar`, a `PaginationNav` and a search box all narrow: they exist to show
the Admin less than the whole, because the whole is unusable. On a set the Admin
already sees entire, a control that hides part of it takes something away and
calls it a feature.

Sorting takes nothing away. It answers *which is the biggest*, and that is not
visible at a glance in a table of forty rows even when every row is on screen.
So sorting survives — **and it survives in the URL**, through ADR-0014's schema
and `SortHeader` + `buildSortHref`, because a sorted list is still a link
someone shares, still middle-clickable, still reproduced by a reload. A bounded
list is not permission to sort in the browser: #51 refused that on its own
merits — a client comparator that must know which columns are text and which are
numbers, sitting beside a `buildSortHref` that already exists — and this ADR does
not reopen it.

### The premise is recorded, not enforced

There is no cap, no guard, no assertion and no warning. Nothing in the code
knows this rule; this document is the entire record of it, and the tests
ADR-0017 would write for a rule have nothing to attach to, because there is no
rule at runtime — there is a query with no `limit`.

That is deliberate, per #54: a cap would protect a rendering assumption rather
than meaning, and any N is invented. The premise is a claim about the domain,
and claims about the domain are checked by reading them, not by asserting them.

**The reopening trigger is therefore social, not numeric: the day an Admin says
the list is unwieldy.** That is a better signal than any threshold, because it
fires on the thing that actually matters — a surface that stopped being usable —
and it fires whether the count is eighty or eight hundred.

## Consequences

**`list` returns a bare array.** `{ items, total }` exists because
`PaginationNav` needs a page count; with no nav, `total` is a second `count(*)`
computed for nothing. `docs/MODULES.md` already carries this as an exception on
`categories.admin.list`, stated in terms of *"the set is bounded small enough
that an Admin sees it whole"* — which is this rule, written before it had a
name. The doc is the instruction and this ADR is the reason; when brands lands
as the second bare-array list, the exception is a rule with instances rather
than a special case with one.

The ordering matters, and the doc already fixes it: **re-adding pagination is
what re-adds the envelope, and in that order.** The shape follows the surface,
never the other way round. A reader who "fixes" a bare array back into an
envelope because seven other lists have one has inverted it.

**ADR-0016 is not amended, and was never engaged.** It decided that a table
composes primitives and owns its markup — which a bounded list obeys — and that
filters are declared as data and rendered by one shared bar. A surface that
declares no filter never reaches that gate, and a surface that has not reached a
gate has not failed it.

**The absent controls will read as an oversight**, the way ADR-0007 warns that
correct duplication reads as a missed extraction. A reviewer arriving at the
brands list from the products list will notice the missing bar and the missing
nav, and the answer is this ADR rather than "no". A reviewer who instead notices
that the *products* list has them is noticing the rule working.

**Skeletons do not derive from a page size.** `ROWS = 8` in
`CategoryTableSkeleton` is a hardcoded count, and `ProductTableSkeleton` was
already 8 rather than `PRODUCTS_PER_PAGE` before any of this — so a module with
no `perPage` constant loses nothing.

**A second ADR shares this premise and reopens separately.** ADR-0026 licenses a
form to open in a dialog, and its cost clause — carrying what the form edits must
not turn the list into a payload nobody reads — is anchored to the bounded-set
property defined here rather than to a row count. The two reopen on different
triggers: this one when a bounded list outgrows one page, that one when a dialog
form grows a query. A list that stops being bounded takes the dialog form down
with it, which is the sharpest reason to keep the definition above about the
domain rather than about the count.
