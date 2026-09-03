# PROTOTYPE — kit vs primitives (issue #11)

**Throwaway. Never merged.** Branch `prototype/admin-kit-vs-primitives`, cut
from `wayfinder/admin-shell`.

> Do admin surfaces share an abstraction, or only conventions and a few
> primitives?

```
bun dev
open http://localhost:3000/prototype/admin-list   # the 2x2
open http://localhost:3000/prototype/product-form # the stress sketch
```

The floating bar drives a 2×2. `?source=off` hides the source panel.

|  | **brands** (easy) | **products** (hard) |
| --- | --- | --- |
| **(a) kit** | `kit/brands.resource.tsx` | `kit/products.resource.tsx` |
| **(b) primitives** | `primitives/brands-list.tsx` | `primitives/products-list.tsx` |

It sits outside `(admin)` so `requireAdmin()` never fires and it opens without
a seeded Admin.

## What is held constant

Both shapes receive an **identical, already-parsed `input` object** and an
identical row array. Shared on purpose, because none of it is what is under
test: `params.ts` (the ADR-0014 schemas), `sort.ts` (`buildSortHref` and the
toggle rule), `fixtures.ts`, and the existing `components/ui/*`,
`components/pagination-nav.tsx` and `hooks/use-query-param.ts`.

The only variable is **how a surface is authored** between "input + rows" and
"rendered list". Both use a native `<select>`, because the control's chrome
would be identical either way.

## The answer, and where it comes from

**(b), with the filter bar config-driven and the table hand-written.** The line
that separates them is one clause of the RSC contract:

- a **filter spec is data** — strings and option arrays — so it crosses the
  server/client boundary as a prop, and `primitives/filter-bar.tsx` renders
  every surface's filters from a declaration;
- a **column spec is functions** — `cell`, `rowHref` — so it cannot, which is
  what forces a config-driven *table* into the browser in its entirety.

Measured against the running dev server, `?source=off`:

| | client boundary | rows serialized to the browser |
| --- | --- | --- |
| primitives | `FilterBar` only | no |
| kit | the entire list | **yes** — `{"rows":[{"id":"brand-6","name":"AKG",…}]}` |

The kit's flight payload is *smaller* (24 KB vs 62 KB on products) because raw
rows are cheaper than their markup. That is a property of these rows, not a
principle, and it flips as soon as a row carries a field the table never
renders. Client JS could not be compared: both shapes share one route.

## What it cost to write

Code lines, blanks and comments stripped.

| | shared, once | brands | products | 8 surfaces (est.) |
| --- | --- | --- | --- | --- |
| (a) kit | 234 | 45 | 113 | ~870 |
| (b) as first built | 94 | 129 | 232 | ~1530 |
| **(b) settled** | **131** | **112** | **159** | **~1215** |

The config-driven filter bar took 20 lines off brands and 73 off products, so
the remaining gap is ~350 lines across eight surfaces — the price of keeping
the tables on the server.

The two tables are byte-identical except for one column: `kit/resource-list.tsx`
forces column 0 to carry the row link, so products' thumbnail cannot go first.

## The stress sketch

`/prototype/product-form` — products' create form in shape (b): nested
variants (`useFieldArray`, eight fields a row, pt-BR money into cents),
specification rows, and out-of-band image upload.

It is the component that settles the question, because no `fields: FieldDef[]`
describes it. Three things it records:

- **One form, one mutation.** `CONTEXT.md` says every Product has at least one
  Variant, so create cannot be staged — the first step would write an invalid
  Product. The schema's `.min(1)` makes that structural.
- **Images go out of band.** ADR-0012 has no Server Actions, so the file goes
  straight to S3 against a presigned URL from a procedure and the form carries
  only the key. **Consequence, unowned:** an abandoned form leaves an orphaned
  S3 object, and nothing in the map has decided who cleans it up.
- **`VariantFields` and `SpecificationFields` are not the same component**, and
  sharing a `<FieldArray>` between them would be the exact "almost the same"
  move this ticket was asked to rule on.

One repo fact found on the way: `form.watch()` trips
`react-hooks/incompatible-library` and opts the component out of React
Compiler. `useWatch({ control })` is the form to use.
