# 44. The filter controls are shared; the bar is not

Date: 2026-09-09

## Status

Accepted

## Context

`components/filter-bar.tsx` is the one filter bar of all eight admin lists
(ADR-0016). The catalogue is the first shop surface with filters, and the
obvious question is whether it uses that file.

ADR-0016's own test says it can. The test is **what the declaration is made
of**: a filter spec is strings and option arrays, so it crosses the RSC boundary
as an ordinary prop and can be shared; a column spec needs a `cell` function, so
it cannot. The shop's filters are Marca (a select), a price range (two numbers)
and Ordenar (a select). Nothing needs a function. The ADR does not push the shop
away.

What differs is not the declaration but the **arrangement**:

- a mobile `Filtrar` Sheet, with **Ordenar deliberately outside it** — sorting is
  a different act from narrowing, and it is what a shopper on a phone reaches
  for most
- a price range that must write **two parameters in one navigation**, where
  `buildFilterHref` takes exactly one key
- `FilterBar` today hard-codes its layout as a flat `<div className="flex
flex-wrap items-center gap-2">`

So the file is shareable in its rules and unshareable in its shape. Copying it
into the shop would duplicate the rules; extending it with a `variant` prop
would put both audiences' layouts in one component and make every future change
to either one a change to both.

The rules are the part that must not be duplicated, because each of them fails
**silently**. A shop bar that forgot _every filter change drops the page_ would
filter to a smaller result set while `?pagina=7` stood, and hand the shopper an
empty grid with no explanation — the exact failure ADR-0016 wrote the rule to
prevent, reproduced on the surface that faces the public.

## Decision

**The controls are shared; the bar that arranges them is not.**

`components/filter-bar.tsx` splits. The controls — `FilterSearch`,
`FilterSelect`, and a new `FilterRange` — keep every rule and are exported for
both audiences: the debounced text input, `useOptimistic` for discrete filters,
`replace` rather than `push`, the `data-pending` attribute, and **every filter
change drops the page**. Each audience owns a thin arranging component: admin's
flat row stays where it is, and the shop's composes the same controls into its
Sheet.

`docs/READ-PATH.md`'s heading narrows from _"one filter bar owns every write"_ to
**one control set owns every write**, which is what it always meant — the
sentence was true of admin because admin had one arrangement.

**`buildFilterHref` takes `values: Record<string, string | null>`** instead of a
single `key`/`value` pair, so a range writes `preco_min` and `preco_max` in one
navigation. Writing them one at a time would fire two renders and leave a
half-applied range in history. Admin's call site becomes `{ [key]: value }`; the
alternative — an `extraValues` escape hatch beside the singular form — is the
same generalisation wearing an apology.

**`FilterRange` is debounced on the search box's timing**, because a range holds
uncommitted keystrokes for exactly the reason a search box does. It is the
second caller of `useQueryParam`'s pattern rather than a new one.

**On the shop, sort is a filter.** `?ordenar=` is written through
`buildFilterHref` like any other parameter, so `lib/utils/sort.ts` gains **no
shop caller at all** and sorting drops `?pagina=` through the same `resetKeys`
every filter uses. `docs/READ-PATH.md`'s _sort is a link, not a control_ is
unchanged and still governs admin: it is an argument about **sortable column
headers in a table**, and a grid has no headers to hang anchors on. The shop's
five options are a closed enum a shopper picks from a control, not a field ×
direction matrix (ADR-0033's list input already settled that half).

**The Sheet mounts one tree, never two.** The controls are arranged
responsively, not duplicated behind breakpoint classes. Two copies means two
`FilterSearch` instances with two independent debounce timers writing the same
parameter, and a resize mid-typing silently drops a keystroke.

## Consequences

**A rule added to a control reaches both audiences; a layout added to a bar
reaches one.** That is the split doing its job, and it is the thing to check
when the next surface grows filters.

**Admin's call site changes** for `buildFilterHref`'s signature. It is a pure
function with tests and one behaviour, so the change is mechanical.

**A third audience would compose the controls, not fork the bar.** If a future
surface wants a third arrangement it writes one, and nothing about the rules
moves.

The repetition this leaves — two components that both map a spec array to
controls — is real and deliberate, the same trade ADR-0016 made for eight
`<tbody>` blocks. The test is the same one: the shared thing is what the
declaration is made of, and layout is not part of the declaration.
