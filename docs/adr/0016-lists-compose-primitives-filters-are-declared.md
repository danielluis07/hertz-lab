# 16. Admin lists compose primitives; only the filter bar is declared

Date: 2026-09-03

## Status

Accepted

## Context

Eight admin modules each get a list surface, and they are near-identical in
shape: a search box, a few filters, sortable headers, a paginated table. That
similarity invites a config-driven resource kit — a module declares its columns
and filters, a shared engine renders everything — and abstractions over "almost
the same" surfaces are where admin codebases go wrong. This is the largest
single lever in the module architecture, so it was settled by building both
shapes rather than by asserting one.

Both were built, twice each: `brands` (two columns, one filter, the surface a
kit is designed for) and `products` (five columns, four filters, per-field sort
defaults, a status badge, a thumbnail). All four received an identical,
already-parsed `input` object and an identical row array, so the only variable
was how a surface is authored. Prototype:
`prototype/admin-kit-vs-primitives`, linked from issue #11 and never merged.

**The kit was cheaper, and by more than expected.** Roughly half the code per
surface, and the gap did not collapse on the hard surface: ~870 lines across
eight surfaces against ~1530. The argument that a kit only survives `brands`
is not supported by the evidence.

**But a config-driven table cannot stay on the server.** A column spec carries
`cell` and `rowHref` — functions — and functions do not cross the RSC boundary.
So the config file must itself be `"use client"`, which puts the entire list in
the browser. Measured against the running prototype:

| | client boundary | rows serialized to the browser |
| --- | --- | --- |
| primitives | the filter bar only | no |
| kit | the entire list | yes — the raw row array, as a prop |

A **filter** spec has no such problem. It is strings and option arrays — data —
so it crosses the boundary as an ordinary prop while the table stays server
markup. The two halves of "the surfaces are near-identical" turn out to sit on
opposite sides of one line in the framework's contract, and that line is what
decides the question.

Two smaller findings pointed the same way. The engine had to invent a rule the
config could not override — the first column carries the row link — so products'
thumbnail could not be placed first. And three of the eight surfaces do not
conform at all: `reviews` is list-only, `orders` and `customers` have no create
page, so each would add an optional field to the definition type.

Against that, one honest correction to the expected trade: the kit's payload is
*smaller* (24 KB against 62 KB on products), because raw rows are cheaper to
send than their rendered markup. That is a property of these rows and reverses
as soon as a row carries fields the table never renders. Client JS could not be
compared — both shapes shared one route in the prototype.

## Decision

**A list surface composes primitives and owns its own table markup. Its filters
are declared as data and rendered by one shared bar.**

The test that draws the line, and the one to apply to anything proposed for
sharing later:

> Can the declaration be **data**? Then share it.
> Does it need a **function**? Then it is markup the surface owns.

Concretely, four pieces:

| Piece | Lives at | Why it may be global |
| --- | --- | --- |
| `FilterBar<TInput>` | `components/filter-bar.tsx` | Takes its spec as a prop |
| `SortHeader`, `EmptyRow`, `TableShell` | `components/data-table.tsx` | Know no column, no row |
| `buildSortHref` | `lib/utils/sort.ts` | Pure; takes the field and defaults as arguments |
| the table itself | `modules/<name>/admin/components/<name>-table.tsx` | Knows its columns |

All four arrive by the **promotion** gate in `docs/MODULES.md`, not as frames:
a second module needs each, and none knows a rule about a module. `FilterBar` is
the judgement call and it is recorded as one — it knows that a filter change
drops `page`, that filters replace rather than push, and that the search box
debounces. Those are rules about *URL-driven lists*, not about any entity, and
they are the same class of knowledge `buildPageHref` already has when it drops
`?page=1`. A `FilterBar` that knew what a Product's statuses are would fail the
gate; one that receives them as options does not.

The surface's own filter spec — the array of `FilterSpec<TInput>` — lives in the
module beside its list, `modules/products/admin/`, typed against the list input
so a filter key that is not a parameter does not compile.

**A list surface is therefore: a server component the module owns, holding a
heading, `<FilterBar>`, a table it writes itself, and `<PaginationNav>`.** The
only client code on the page is the filter bar.

## Consequences

The tables stay on the server. Header rows, cells and pagination are HTML,
sort headers are anchors, and no row data is serialized into the page — which is
what `docs/DATA-FLOW.md` was already reaching for when it kept sort as a link
and pagination JavaScript-free. That property is preserved by construction now
rather than by care.

The cost is about 350 lines across the eight surfaces, and it is paid in the
most repetitive kind of code there is: eight `<tbody>` blocks that differ only
in their columns. A reviewer who notices that repetition and proposes to factor
it away is noticing something real, and the answer is not "no" but the test
above — the filter halves of those surfaces *were* factored away, on exactly
that reasoning.

Adding a column to a list is a markup edit. Adding a filter is a line in an
array plus a field in the ADR-0014 schema, and the two are type-checked against
each other.

The three non-conforming surfaces cost nothing: `reviews` writes a list with no
row link, `orders` writes one with no create button, and neither needs anything
switched off.

This decision is about the **list**. It was checked against the **form** before
being taken — products' create form is nested variants, specification rows and
an out-of-band image upload, which no field-list declaration describes — and
that sketch is on the prototype branch. No part of a form is shared today.

**One clause corrected by the products exemplar.** "The filter bar is the only
client component on the page" holds for a list with no per-row action, and
products has one: publish and archive need an `onClick`, so
`product-row-actions.tsx` is a second client component. It is a leaf receiving
an `id` and a `status`, so the property this ADR actually decided on — that the
raw row array is never serialized to the browser — is untouched. The
measurements stand.

The same exemplar cashes in the form sketch this ADR ended on. *One form, one
mutation* turned out to mean more than it said: because a Product is an
aggregate of four tables, "one mutation" forced a reconciling transaction and a
form that speaks array indices rather than database ids. That is ADR-0019.
