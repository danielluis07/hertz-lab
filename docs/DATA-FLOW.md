# Data flow

How a page gets its data, and who owns the boundaries around it.

This file has two halves. The first is the **read path**: which module a
procedure belongs to is settled by `docs/MODULES.md`; how a procedure reaches
the database is ADR-0010; the rule that decides what gets shipped to the
browser is ADR-0011, and the first half is that rule applied.

The **write path** is the second half of this file. Every write is a tRPC
mutation (ADR-0012), and how a failure becomes pt-BR copy is ADR-0013.

# The read path

## Which path a query uses

There are three ways a server component can get data, and the choice is made
**per query, not per page**. A single page routinely uses more than one.

The test is mechanical:

| Does a client component call `useSuspenseQuery` on it? | Does the server component also need the value? | Use |
| --- | --- | --- |
| yes | no | `prefetch(...)` — void, streams |
| yes | yes | `await load(...)` — one fetch, both consumers |
| no | — | `caller.x.y()` |

All three live in `@/trpc/server`.

```tsx
// app/(admin)/admin/products/[id]/page.tsx
export default async function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;

  // the server needs the name for the heading; the form reads the same query
  const product = await load(trpc.products.admin.byId.queryOptions({ id }));
  if (!product) notFound();

  // only the client chart reads this one
  prefetch(trpc.reviews.admin.summary.queryOptions({ productId: id }));

  return (
    <HydrateClient>
      <h1>{product.name}</h1>
      <ProductEditForm product={product} />
      <Suspense fallback={<ReviewSummarySkeleton />}>
        <ReviewSummary productId={id} />
      </Suspense>
    </HydrateClient>
  );
}
```

> An earlier version of this example split the Variants into their own
> `products.admin.variants` query. That is wrong for this module and the example
> has been corrected: ADR-0016 fixed *one form, one mutation*, and one React
> Hook Form needs one `defaultValues` object — so `byId` returns the **whole
> aggregate** (variants, images, specifications) in one query, and there is
> nothing left to split. See `docs/PRODUCTS-ADMIN.md`. The shape the example is
> teaching — two queries, two paths, one page — still holds; the second query
> just has to be data the form does not own.

**`caller` is not "data rendered on the server".** It is data **no client query
exists for** — nothing calls `useSuspenseQuery` on it anywhere, so there is
nothing to hydrate and no reason to pay for dehydrating it.

Anything fetched through `getQueryClient` — which is both `prefetch` and `load`
— is dehydrated by `<HydrateClient>` and shipped to the browser whether or not a
client component reads it. Keeping `caller` for server-only reads is what stops
a page shipping a payload nothing consumes. That is the whole of ADR-0011, and
it is why no further rule about `<HydrateClient>` placement is needed: put it at
the page root, because by construction it dehydrates exactly the set a client
component reads.

`prefetch` is never awaited. Awaiting it would block the shell behind the data
and give up streaming, which is the point of having a boundary at all.

### A note on static rendering

`trpc/server.tsx` used to justify `caller` as being "for static rendering". That
reason does not hold in admin: ADR-0006 puts `requireAdmin()` in every admin
`page.tsx`, `requireAdmin()` reads `headers()`, and so **every admin route is
already dynamic**. Admin has no static/dynamic trade-off to make.

On the shop side that trade-off is real — a product page with no session read
can be static — but `caller` still earns its place there for the reason above,
not for that one. Shop surfaces are otherwise outside what this file specifies.

## Query keys and server/client parity

A tRPC query key is `[path[], { input, type }]`, hashed with `JSON.stringify`.
`undefined` values are dropped from the hash, so `{ search: undefined }` and
`{}` are the same key — and `{ search: "" }` is a different one.

This makes the input object load-bearing for key *identity*. If the server
prefetches with one input and the client builds a subtly different one, the keys
do not match, hydration misses, and the page refetches on mount. Nothing errors;
it is just silently slower.

**The page normalises once and passes the input down as a prop.** The client
component feeds that object straight into `queryOptions` and never derives its
own:

```tsx
const input = normalizeProductsParams(await searchParams);
prefetch(trpc.products.admin.list.queryOptions(input));
return <ProductTable input={input} />;
```

Both sides re-deriving from the URL and trusting a shared normaliser to converge
is the alternative, and it is the one that fails silently — every filter added
later is a fresh chance to diverge. Passing the object makes parity structural:
the client cannot disagree because it never computes one.

That input comes from the URL, and how it is built is the next section.

## The list input

A list's filters, sort and page live in the URL. **One Zod schema per list turns
that URL into the procedure's input** — ADR-0014 — and the same schema is the
procedure's `.input()`. There is no separate normaliser, and no hand-written
input type: `ProductListInput` is `z.infer<typeof productListParamsSchema>`.

It lives in the **audience folder**, not the module root:
`modules/products/admin/schemas.ts`. `docs/MODULES.md` puts the entity's own
vocabulary at the root and one audience's vocabulary in its folder, and a filter
schema is squarely the latter — an admin list is paginated and includes `draft`
and `archived`, which is a sentence only the admin can say. The module root's
`schemas.ts` holds the Product itself.

### Invoking it

The module exports a named function beside the schema, and the page calls that:

```tsx
// app/(admin)/admin/products/page.tsx
const input = parseProductListParams(await searchParams);
prefetch(trpc.products.admin.list.queryOptions(input));
return <ProductTable input={input} />;
```

The function is the artifact ADR-0011 points at when it says the page normalises
once. It owns the `await`, keeps Zod out of `page.tsx`, and reads at the call
site as what it is.

**The page types `searchParams` itself.** Next's generated `PageProps` types
`params` but not `searchParams`, so the page declares
`Promise<Record<string, string | string[] | undefined>>` — which is also the
honest shape, and the reason the schema has coercion to do at all.

### What is a parameter, and what is not

Each one earns its place against a column the database can actually serve. For
products that is `search` (backed by the `product_search_idx` GIN index over the
Portuguese `tsvector`), `status`, `categoryId` and `brandId` (both indexed
foreign keys), plus `sortBy`, `sortOrder` and `page`.

**`perPage` is not a parameter.** An admin table's page size is a layout
decision — the table is built for a row count — so it is a module constant,
`PRODUCTS_PER_PAGE`, and the procedure takes it from nowhere. Exposing it varies
every query key on a value nobody changes and hands an Admin `?perPage=100000`.
It becomes a parameter the day a real page-size control is specified, and it
brings a `.max()` clamp with it.

**A `createdAt` range is not a parameter either.** "Products created between two
dates" is an *orders* question wearing a catalog costume; when a date range is
genuinely needed it lands in the module whose entity is temporal.

Price and stock are not sortable or filterable on a Product list at all: they
live on the Variant (ADR-0001), so sorting a Product by price first requires
deciding *which* Variant's price. That is a real decision and not this one.

### Sort

**Two parameters, `sortBy` and `sortOrder`, not a combined `?sort=name.asc`.**
This follows from ADR-0014's per-field `.catch()`: split, a garbage direction
costs you only the direction, while a combined parameter has to catch the whole
thing and lose the field with it. It is also directly readable in the address
bar, which is worth something on an internal surface.

**The default direction is per field, not global.** `createdAt` defaults to
`desc` (newest first), `name` to `asc` (A-Z), `ratingAverage` to `desc` (best
first). One global `desc` would sort products Z-A the first time an Admin clicks
the name column, which reads as a bug. That table is a module constant: it is a
rule about *these* fields, not a shape.

### Parameter names

**The schema's keys are the parameter names.** ADR-0005 gives admin routes
English parameters and the schema's fields are English, so the URL key and the
input field are the same string. A `PRODUCT_LIST_PARAMS` constant mapping
`"search"` to `"search"` stores no information; the schema is the single
declaration, and adding a filter is a one-line change there.

Call sites that need the literal — `PaginationNav`'s `paramKey`, the filter hook
below — type it as `keyof ProductListInput`, so a typo stops compiling instead
of silently paginating nothing.

The shop side is where a real mapping will exist, since ADR-0005 gives it
`busca` and `pagina`. Admin's identity is exactly why no mapping exists here,
and why `useQueryParam` and `buildPageHref` take the key as an argument rather
than assuming either vocabulary.

## What a list surface is made of

All eight admin lists are the same four pieces, and ADR-0016 fixes which of
them are shared:

```tsx
// app/(admin)/admin/products/page.tsx
<div className="group">
  <h1>Produtos</h1>                                     // the page's own heading
  <FilterBar filters={productFilters({ … })} input={input} />  // shared, declared
  <div className="group-has-data-pending:opacity-50">    // the dimming, one place
    <Suspense fallback={<ProductTableSkeleton />}>
      <ProductTable input={input} />                     // markup this module owns
    </Suspense>                                          // …and <PaginationNav>
  </div>
</div>
```

The bar sits in `page.tsx` and **outside** the Suspense boundary: it is part of
the shell an Admin gets immediately, and a filter change must never replace the
control that made it. The dimming class is on the wrapper around the boundary,
so exactly one element in the tree knows about `data-pending`.

**The filter bar is the only client component on the page** — with one
exception the exemplar found: a list whose rows carry a **status action**
(publish, archive, moderate) needs an `onClick`, so it has a second client
component, `<name>-row-actions.tsx`. It is a leaf — a `<td>`'s worth of buttons
taking an `id` and a `status` — so the property that actually matters is
unharmed: the header row, every cell and the pagination are still HTML, and **no
row data is serialized into the document**.

The dividing line is whether the declaration can be **data**. A filter spec is
strings and option arrays, so it crosses the RSC boundary as a prop and can be
shared. A column spec needs `cell` — a function — which cannot cross it, so a
config-driven table would drag the whole list into the browser. That is the
whole argument; the measurements behind it are in ADR-0016.

The repetition this leaves is real: eight `<tbody>` blocks that differ only in
their columns. It is deliberate, and the test above is the answer to anyone who
proposes to factor it away.

## Filter controls

Writing a filter to the URL is a navigation. Every filter control does it inside
a **transition**, which is what makes the list behave: the page keeps rendering
the old URL state until the new server render arrives, so **a filter change does
not re-suspend the table**.

### One filter bar owns every write

**No component calls `useQueryParam` or `router.replace` directly.** One shared
component — `components/filter-bar.tsx` — owns every filter write on every admin
list, and the module supplies only a **spec**:

```tsx
// modules/products/admin/constants.ts
function productFilters({ brands, categories }): readonly FilterSpec<ProductListInput>[] {
  return [
    { kind: "search", key: "search", placeholder: "Buscar por nome ou descrição..." },
    { kind: "select", key: "status", label: "Status",
      allLabel: "Todos os status", options: PRODUCT_STATUS_OPTIONS },
    { kind: "select", key: "brandId", label: "Marca",
      allLabel: "Todas as marcas", options: brands.map(…) },
    { kind: "select", key: "categoryId", label: "Categoria",
      allLabel: "Todas as categorias", options: categories.map(…) },
  ];
}
```

**A function, not a constant**, and that is the one correction the exemplar made
to this section: two of the four filters are *rows*. Brand and Category options
are read per request by the composing route below, so they cannot be frozen into
a module constant — and taking them as an argument is what keeps the mapping
from `{ id, name }` to `{ value, label }` out of `page.tsx`, which composes and
nothing more. A surface whose filters are all static declares a constant.

`allLabel` is the "no filter" option's pt-BR copy, and it is in the spec rather
than in the bar because `Todas as marcas` and `Todos os status` do not agree on
gender: a shared component holding one `"Todos"` would be wrong half the time.
The search box carries a `key` for the same reason every other control does —
the parameter name is the surface's, never the bar's (ADR-0005).

The spec is **data**, which is why it can be shared at all: it crosses the
server/client boundary as an ordinary prop, so the table beside it stays a
server component. A *column* spec cannot — `cell` is a function — which is the
whole of ADR-0016 in one sentence, and the reason the table is markup the module
writes itself.

`key` is typed as a key of the list input, so a filter on a parameter the
ADR-0014 schema does not declare fails to compile.

What the bar owns, once, for all eight surfaces: the debounced search, the
optimistic value of each discrete filter, `replace` rather than `push`, the
`data-pending` attribute, and the rule that would otherwise need repeating in
five places — **every filter change drops `page`.** Filter to a smaller result
set while `?page=7` is still in the URL and the Admin gets an empty table with
no explanation.

That last one is a rule, and a global component holding it is a deliberate
exception argued in ADR-0016: it is a rule about *URL-driven lists*, the same
class `buildPageHref` already holds when it drops `?page=1`, and not a rule
about any module. A filter bar that knew what a Product's statuses are would
belong to `products`; one that receives them as options does not.

### Debounced and discrete are different

**`useQueryParam` is for the debounced text input, and nothing else.**

Its `useState` mirror of the URL, and the render-phase `synced` block that
re-adopts the URL on a back button or route change, exist for exactly one
reason: a debounced search box holds uncommitted keystrokes the URL does not
have yet. That is genuinely hard, and the hook is where it is solved.

A `status` dropdown has no uncommitted state — one click, one navigation. It
uses **`useOptimistic(input.status)`** and needs no sync logic at all: React
reverts it to the new prop when the transition ends, which is the same
reconciliation `useQueryParam` hand-rolls. Reaching for `useQueryParam` there
inherits forty lines of machinery to solve a problem the control does not have.

These are one pattern — write the URL in a transition — with debounce as the
special case that needs local state.

### Sort is a link, not a control

`lib/utils/pagination.ts` opens by saying pagination is a navigation, not a
state change, and `PaginationNav` ships no JavaScript. **A sortable column
header is the same shape**: a sorted list is a URL, and the current sort is
computable from the `input` prop the page already passes down. The toggle rule —
clicking the active column flips its direction, clicking a new column starts at
that column's own default — is pure.

So sort headers are anchors, the header row stays a server component, and the
whole sort surface is free, shareable and middle-clickable. It needs a
`buildSortHref`, and this reached its second caller the moment a second list
existed, so it lives at **`lib/utils/sort.ts`**, beside `lib/utils/pagination.ts`
and for the same reason: it takes the field, the current sort and the default
direction as arguments, so it knows a shape and never a rule. The field list
never is global.

`SortHeader` — the anchor plus its direction indicator — is likewise
`components/data-table.tsx`, with `EmptyRow` and `TableShell`. None of the three
knows a column.

### Replace or push

**Changing what is in the list replaces. Moving through it pushes.**

Filters and sort use `router.replace`. A filter is a refinement of the current
view, not a destination — and with a debounced search box, `push` deposits a
history entry per settled keystroke, so the back button walks the Admin
backwards through their own typing instead of leaving the page.

Pagination uses `push`, which it gets for free by being an `<a>`. Page 3 *is* a
destination and back-to-page-2 is what an Admin expects.

### Pending feedback

**Dim the current table; do not fall back to the skeleton.**

The control's root carries a `data-pending` attribute driven by
`useOptimistic`, and an ancestor styles against it —
`group-has-data-pending:opacity-50`. The Admin keeps their reading position and
the layout does not flash.

The skeleton is for the **first paint only**, at the page's `<Suspense>`
boundary. "We have a skeleton, so use it" is the natural wrong inference:
replacing a populated table on every filter change is strictly worse than
dimming, and after the first render of a screen the skeleton should never be
seen again.

One caveat carried from the framework docs: `group-has-data-pending:` compiles
to `:has()`, which the browser re-evaluates over the anchored subtree on every
toggle. That is cheap here — twice per filter change — and would not be on a
high-frequency interaction like dragging.

## Boundaries

Suspense and error handling are **not the same granularity** and are not owned
by the same thing.

**Suspense is per data section, owned by the page.** The fallback has to match
the shape of the specific section it replaces, which a shared wrapper component
cannot know.

**Errors are `app/(admin)/error.tsx` by default.** A failed table and a failed
page are the same event nearly always, and the route-level boundary already
handles it. Add a boundary around one section only when partial failure should
genuinely leave the rest of the page usable.

Where a per-section boundary *is* justified, use **`catchError` from
`next/error`**, not a hand-rolled or third-party error boundary:

```tsx
import { catchError } from "next/error";
```

`redirect()` and `notFound()` work by throwing sentinel errors. A plain error
boundary catches them, so wrapping a section in one turns every `notFound()`
inside it into "Algo deu errado". `catchError` is framework-aware and lets the
sentinels through.

### No `loading.tsx` in admin

There is none, deliberately. A `loading.tsx` replaces the **entire** route
segment during navigation, which would throw away the instantly-rendered shell —
nav, heading, filter bar — that per-section Suspense exists to deliver. Since
pages await nothing but their own `load` calls, the shell is available
immediately and only the data sections need to show anything.

### Skeletons

A skeleton belongs to the component it stands in for, in that component's
module: `modules/products/admin/components/product-table-skeleton.tsx` beside
`product-table.tsx`.

It knows that table's column count and widths, which under ADR-0007 is a *rule*
about the shape, not a shape — so it cannot be a global `<TableSkeleton>`. It is
a **sibling file**, not a second export: it is a different component with a
different tree, and the page (a server component) imports the skeleton while the
table is `"use client"`.

`components/ui/skeleton.tsx` stays what it is — the shadcn primitive these are
composed from.

## Absence

**`null` means "this resource does not exist". `[]` means "nothing matched".**

A `byId`-shaped procedure returns `null` rather than throwing `NOT_FOUND`, and
the page turns that into the Next primitive:

```tsx
const product = await load(trpc.products.admin.byId.queryOptions({ id }));
if (!product) notFound();
```

This keeps control flow in `page.tsx`, where ADR-0006 already puts
`requireAdmin()`, and spares every page a try/catch that maps a `TRPCError` code
back into a framework call. It also gives the client path sensible behaviour for
free: a client component reading a nullable result renders an empty state
instead of tripping a boundary.

**A list always succeeds.** An empty result is a valid one — it renders an empty
state, never a 404 — and only a route's own `[id]` segment can produce a `null`.
`/admin/products?categoryId=<gone>` therefore shows an empty list, not a missing
page: a filter is a *view* of a list, not a resource, and the admin's fix is to
clear the filter, which an empty state invites and a 404 does not.

The asymmetry with the write path is deliberate: **reads resolve to "absent",
writes resolve to "refused"**. Mutations keep real `TRPCError` codes.

## The query client

`trpc/query-client.ts` holds three settings that hydration depends on. They look
adjustable and are not.

**`staleTime: 30 * 1000`.** It must be greater than zero. At `0` every hydrated
query is stale the instant it mounts and refetches immediately, throwing away
the server's work and silently doubling every page load. "Admin data should be
fresher, so lower the staleTime" is the plausible-sounding edit that breaks
this. Freshness after a write is the invalidation path's job, not this number's.

**`shouldDehydrateQuery` includes `status === "pending"`.** This is what lets a
voided `prefetch` dehydrate as an in-flight promise and stream. Without it, only
settled queries would cross to the client and `prefetch` would have to be
awaited.

**`refetchOnWindowFocus: false`.** With a 30-second stale window, focus
refetching mostly fires on tab-switches that changed nothing.

## `lib/request-cache.ts`

It does not exist and will not. An older comment in `trpc/server.tsx` referred
to it as the place to wrap `caller` calls for per-request deduplication.

React's `cache` **is** the request cache; a module that re-exports it adds a name
to learn and hides the standard one. Where a module genuinely needs per-request
dedup, it imports `cache` from `react` in its own `server/` file. Under ADR-0010
there is currently nothing to dedup: `createTRPCContext` is already wrapped, and
no query layer exists until a second caller needs one.

---

# The write path

Every write is a tRPC mutation (ADR-0012). There are no Server Actions, and
`refresh()` from `next/cache` — which only works inside one — is unreachable
here.

## Three tiers, and who owns each

A mutation has three places to hang behaviour, and **all three fire, in order,
adding rather than replacing**: the `MutationCache` config, then the hook's own
options, then the object passed to `mutate()`. That they are additive is what
lets the layers stay separate.

| Tier | Lives in | Owns |
| --- | --- | --- |
| `MutationCache` | `trpc/query-client.ts` | the pt-BR error toast, for every write in the app |
| `mutationOptions` | the module's mutation hook | invalidation, the success toast |
| `mutate(vars, {…})` | the component | navigation |

The split between the last two is **facts about the write** versus **facts about
the surface**. `products.admin.archive` says *"Produto arquivado."* whether it
was fired from a table row or from a detail page, so that sentence belongs with
the write. Where the Admin goes next genuinely differs per surface.

A hazard forces that split rather than merely suggesting it: the third tier is
guarded by `if (this.#mutateOptions && this.hasListeners())`, so a **call-site
callback does not run if the component has unmounted**. Anything that must
happen regardless of what the UI did belongs in the hook.

## The mutation hook

Each write gets one hook, in the audience's `hooks/` folder, named for the verb:

```ts
// modules/products/admin/hooks/use-archive-product.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

export const useArchiveProduct = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.products.admin.archive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.products.pathFilter());
        toast.success("Produto arquivado.");
      },
    }),
  );
};
```

A hook exists because the invalidation set is a **rule about the module**, and
ADR-0007 keeps rules out of the global layer while `docs/CONVENTIONS.md` keeps
them out of `.tsx` files. It owns the mutation, its invalidation and its success
copy — and nothing else. Confirmation, navigation and form wiring stay at the
call site.

`mutationOptions` reserves only `mutationKey` and `mutationFn`, so every
lifecycle hook is free to use.

## Invalidation

**A write invalidates its own module's path.**

```ts
queryClient.invalidateQueries(trpc.products.pathFilter());
```

This reads far blunter than it behaves. `invalidateQueries` marks every matching
query stale but **refetches only the *active* ones** — those a mounted component
is observing. On an admin page that is one or two queries, not the forty entries
the products cache has accumulated across filter combinations. Targeted
invalidation buys almost nothing here and is the thing that silently rots the
first time a procedure is added to the module and nobody updates the list.

`docs/MODULES.md` nested the audience axis inside `server/` partly for this:
`trpc.products.pathFilter()` reaches both audiences, `trpc.products.admin`
reaches one. Prefer the module path — a write that changes what a shopper sees
should invalidate the shop's view of it too.

**A second module's filter is named only where the write demonstrably changed
that module's data.** The canonical case is a Review write also invalidating
`products`, because ADR-0004 denormalises the rating onto the Product. ADR-0009
says which way that may point: the foreign key's direction is the dependency's
direction, so `reviews` may reach into `products` and never the reverse.

## No optimistic updates

**Admin surfaces do not use optimistic updates.** This is a decision, not an
omission, and "admin should feel snappier, add optimistic updates" is the
plausible-sounding change that is not wanted.

The tRPC options proxy contributes nothing to them — no `setData` or `cancel`
equivalent — so it is plain TanStack v5: `onMutate`, `cancelQueries`, snapshot,
rollback. The cost of doing that correctly scales with the number of distinct
cached inputs, and a filterable admin list has one cache entry per
`{page, perPage, search, sortBy, sortOrder, status, categoryId, …}` combination.
A correct rollback therefore needs `getQueriesData` (plural) plus an updater that
reproduces the server's sort, filter and pagination **in the browser** — a second
implementation of the query, which goes stale the first time a filter is added
and fails in a way no test will catch.

Against that: an Admin editing a Product tolerates a spinner, and admin is a
low-traffic internal surface. Revisit only if a specific surface demonstrates the
need, and revisit it for that surface alone.

## After the write

The two mechanisms are not interchangeable, and ADR-0011 already decided which
data lives where. Queries a client component reads with `useSuspenseQuery` live
in the TanStack cache; anything the page read through `caller` lives in the RSC
payload. `invalidateQueries` cannot touch the second, and `router.refresh()`
cannot touch the first.

**Navigating away** — create → detail, remove → list:

```ts
mutate(values, {
  onSuccess: (product) => router.push(`/admin/products/${product.id}`),
});
```

`router.push()` alone. Since Next 15 the client cache's `dynamic` staleTime
defaults to `0`, and `next.config.ts` sets no `staleTimes` override, so the
destination's server components re-render on arrival. A `router.refresh()` after
a push is a second render of the page just rendered.

**Staying put** — edit in place, archive from a list. The hook's
`invalidateQueries` has already handled the hydrated queries. Add
`router.refresh()` **only if that page read something on the server** — a
heading, a breadcrumb, a summary count. On a page whose data is entirely
hydrated, `router.refresh()` is pure waste.

**"On the server" means `caller` *or* `load`, and the second half is the one
that catches people.** An earlier version of this rule said "through `caller`",
which is too narrow: `load` puts its value in the RSC payload *as well as*
hydrating it, and the RSC copy is exactly what `invalidateQueries` cannot
reach. The worked case is `/admin/products/[id]`, where the page `load`s
`byId` for its `<h1>` and the form reads the same query — rename a Product and
save, and the form refetches while the heading keeps the old name until a hard
navigation. So an edit-in-place page that renders *anything* from a server read
adds `router.refresh()`.

The reliable test is not which helper was called but **whether a server
component rendered the value**. `prefetch` alone never does, which is why a page
that only prefetches needs no refresh.

## Destructive writes

`ConfirmProvider` wraps the admin layout and gates writes the Admin **cannot
undo from the same screen**.

| Write | Confirm |
| --- | --- |
| `remove` — a Variant, a Specification, an empty Category | yes |
| Admin logout | yes |
| `orders.admin.cancel` — irreversible, and ADR-0003 snapshots make it final | yes |
| `products.admin.archive` — reversible by filtering to archived | no |
| `reviews.admin.moderate` rejecting a Review — re-moderatable | no |
| create, update, publishing a draft | no |

`docs/MODULES.md` notes that `delete` is usually a lie in this domain, so the
`remove` row is rarer than it looks: most "deletion" in admin is archiving, and
archiving does not confirm.

**An Image is not on that list**, though an earlier draft of this table put it
there. Removing an Image is a *field edit* on a form, not a write of its own —
see "Images" below and ADR-0018.

**The provider takes the action.** It owns pending state and closing, including
on rejection:

```ts
confirm({
  title: "Remover variação",
  message: "Esta ação não pode ser desfeita.",
  action: () => removeVariant.mutateAsync({ id }),
});
```

**The call is not awaited, and `confirm` returns nothing.** Handing the action
over is what removes the question a call site used to answer for itself; a
promise back would re-open it, and one that settles on cancel as well as on
success would say nothing useful anyway. The dialog closes when the action
settles either way — a rejection is already reported by the global tier above.

The provider refuses to close while the action is in flight, so a dismissal
cannot leave the write running behind a closed dialog.

## `mutate` or `mutateAsync`

**`mutate` everywhere, except as the `action` handed to `confirm`.**

`mutate` does not reject, so it cannot produce an unhandled rejection. A bare
`mutateAsync` invites one at every call site that forgets a `.catch`, and the
error is already handled — by the global tier, which fires regardless. The
confirm provider is the one place that genuinely needs to await, and it owns the
`catch`.

## Pending state

A component instantiates its hook **once**, so `isPending` is shared by every row
that fires it. Archiving one Product spins every button in the table.

Scope on the mutation's own variables rather than instantiating a hook per row:

```tsx
const { mutate, isPending, variables } = useArchiveProduct();
// …
<Button disabled={isPending && variables?.id === product.id}>
```

The bug is invisible until the table has more than one row, which is to say it is
invisible in exactly the conditions it is written under.

## Errors

The rule is ADR-0013; this is its shape at a call site.

**By default a component does nothing.** The `MutationCache` handler in
`trpc/query-client.ts` toasts a pt-BR sentence for every failed mutation, so a
write with no error handling still tells the Admin it failed. There is no hook to
forget.

**A form intercepts field-attributable errors.** The `errorFormatter` in
`trpc/init.ts` carries two payloads — `data.zodError` from `z.treeifyError` (Zod
4.5 spells it `z.treeifyError()` / `z.flattenError()`, *not* the Zod-3
`error.flatten()` in tRPC's published recipe) and `data.field`, lifted from a
conflict's `cause`. The form turns them into `setError`:

```ts
mutate(values, {
  onError: (error) => {
    if (error.data?.field) {
      form.setError(error.data.field, { message: error.message });
    }
  },
});
```

and the procedure that raised it names its own field:

```ts
throw new TRPCError({
  code: "CONFLICT",
  message: "Já existe um produto com este SKU.",
  cause: { field: "sku" },
});
```

**The global handler stands down whenever `data.field` or `data.zodError` is
present.** The payload's presence *is* the signal that something else will render
it — no `meta` flag, no opt-out. The consequence to accept is that a
field-carrying error thrown by a mutation with no form attached shows nothing at
all.

`data.zodError` is defence in depth rather than the common path: React Hook Form
runs the same `schemas.ts` through its resolver, so a Zod failure normally never
reaches the server. It matters when the two disagree.

Two constraints from the transport are easy to get wrong:

- **`error.data` is genuinely absent on a transport failure.** The code map needs
  a no-`data` entry, not an `error.data!.code`.
- **`error.data.code` is the discriminator, never `error.message`.**

A procedure's pt-BR `message` wins over the code map, except for
`INTERNAL_SERVER_ERROR`, which always uses the map and never shows its message —
that is the code an *uncaught* error arrives as, and its message is an English
leak. `adminProcedure`'s `"Acesso restrito ao administrador"` is the pattern, not
an anomaly.

## Images

An Image is the one thing on an admin form that does not travel through the
mutation carrying it. The rule is ADR-0018; this is its shape at a call site.

**The file goes to S3 before the row exists.** Selecting a file calls
`trpc.products.admin.createImageUpload({ contentType, size })`, which returns
`{ key, url }`; the browser PUTs the file to `url` and keeps `key`. The key is
an ordinary React Hook Form value from that point on, so `create` and `update`
see an identical images array and submit stays **one mutation** (ADR-0016).

```tsx
// The tile's own state, not the form's: only the key reaches the form.
const { mutateAsync: createUpload } = useCreateImageUpload();

const { key, url } = await createUpload({ contentType: file.type, size: file.size });
await putWithProgress(url, file, setProgress); // XHR — see below
append({ s3Key: key, altText: "", variantId: null });
```

**What the form sends, and what it never sends.**

| Field | Client | Server |
| --- | --- | --- |
| `s3Key` | from `createImageUpload` | `stat`ed on write; missing, oversized or wrong-typed is refused |
| `position` | — | derived from array index |
| `altText` | required, pt-BR, non-empty | schema rule (ADR-0017: tested) |
| `variantId` | **array index** on create, real id on update | index resolved inside the transaction |

The index is the trap. On create the Variants have no ids yet, so a tile cannot
hold a `variantId`; it holds the position of its Variant in the form's variants
array, and the write resolves it after the inserts. Empty means what the
nullable column means — the shot belongs to the Product, not to one Variant.

**Progress is determinate, and that forces XHR.** `fetch` reports nothing
between "sent" and "done"; only `XMLHttpRequest` exposes `upload.onprogress`. A
tile shows a `URL.createObjectURL` preview immediately with a bar over it.
**Submit is disabled while any upload is in flight**, with pt-BR text saying why.

> **The global error net stops here.** ADR-0013 covers every *mutation*, and the
> S3 PUT is not one — `MutationCache.onError` never sees it. `createImageUpload`
> is covered; the upload it authorises is not. A failed tile renders its own
> error with a per-file **Tentar novamente** and raises **no toast**: the
> recovery is item-scoped, and a second home for pt-BR copy is the thing
> ADR-0013 exists to prevent.

**Removal.** Removing a tile whose key was never persisted deletes the S3 object
immediately — that is the one orphan we can see, so we take it. Removing a
persisted one is just an array element leaving the form; the `update` that
writes the shorter array deletes the object as part of the write. Neither goes
through `ConfirmProvider`.

**Orphans are tolerated.** An abandoned form leaves an unreferenced object in
the bucket. There is no sweep, because there is no scheduled runner to run one —
ADR-0018 records the trigger that would reopen it.

## Absence, again

The read half's rule has a write-side mirror worth stating together: **reads
resolve to "absent", writes resolve to "refused".** A `byId` procedure returns
`null` and the page calls `notFound()`; a mutation throws a real `TRPCError` with
a code, because a write that changed nothing is a different event from a row that
does not exist.

## Toasts

`sonner`, added through shadcn, with `<Toaster />` mounted once in
`app/(admin)/layout.tsx` beside `ConfirmProvider`. `toast()` is importable
anywhere and callable outside React, which is what lets the `MutationCache`
handler — not a component — raise one.

> **`shadcn add sonner` does not build as generated.** The block imports
> `useTheme` from `next-themes`, which this project does not install;
> `app/globals.css` defines a `.dark` variant but nothing toggles it. Fix it the
> way `components/ui/pagination.tsx` was fixed — edit the generated file, drop the
> `next-themes` import, and leave a comment at the top saying what changed, per
> `docs/CONVENTIONS.md`. Re-running `shadcn add sonner` reintroduces it.
