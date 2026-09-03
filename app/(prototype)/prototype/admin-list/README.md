# PROTOTYPE — kit vs primitives (issue #11)

**Throwaway. Never merged.** Branch `prototype/admin-kit-vs-primitives`, cut
from `wayfinder/admin-shell`.

> Do admin surfaces share an abstraction, or only conventions and a few
> primitives?

```
bun dev
open http://localhost:3000/prototype/admin-list
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
test:

- `params.ts` — the ADR-0014 schemas, `.catch()` per field, the named parse
  function, per-field sort defaults.
- `sort.ts` — `buildSortHref` and the toggle rule.
- `fixtures.ts` — in-memory rows and the filter/sort/paginate query.
- `components/ui/*`, `components/pagination-nav.tsx`, `hooks/use-query-param.ts`.

The only variable is **how a surface is authored** between "input + rows" and
"rendered list".

`components/ui/select.tsx` is deliberately absent: both shapes use a native
`<select>`, because the control's chrome would be identical either way and is
not the question.

## Measured, not asserted

Against the running dev server, `?source=off`:

| | flight payload | client boundary | rows serialized to the browser |
| --- | --- | --- | --- |
| primitives / brands | 43.2 KB | `BrandListFilters` | no |
| kit / brands | 21.7 KB | `KitBrandsList` (the whole list) | **yes** |
| primitives / products | 62.4 KB | `ProductListFilters` | no |
| kit / products | 24.1 KB | `KitProductsList` (the whole list) | **yes** |

The kit's payload is *smaller* and this is not a point in its favour: it is
smaller because it ships **raw row objects** plus rendering code, where the
primitives ship the **rendered output** and no table code at all. Rows in this
fixture are cheaper than their markup. That is a property of these rows, not a
principle — and it flips as soon as a row carries a field the table never
renders.

The two tables are byte-identical except for one column: see
`kit/resource-list.tsx`, where the engine forces column 0 to carry the row
link, so products' thumbnail cannot go first.

## Not built

The create/edit form. Per the ticket's Method the form is a **sketch through
the winner**, not a fourth quadrant.
