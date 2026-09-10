# The read path

How a page gets its data, and who owns the boundaries around it.

Which module a procedure belongs to is settled by `docs/MODULES.md`; how a
procedure reaches the database is ADR-0010; the rule that decides what gets
shipped to the browser is ADR-0011, and this file is that rule applied.

The other half is `docs/WRITE-PATH.md`.


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
      {/* the id, not the row: the form reads `byId` itself, which is what
          makes `load` the right helper rather than a contradiction of it */}
      <ProductEditForm id={id} />
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
can be static — and there `caller` earns its place for **both** reasons at once.
ADR-0032 settles which path a shop read uses, and the short form is that the
answer inverts: **on the Storefront a query is hydrated if and only if a
shopper's own write can change it.** Nothing a shopper does invalidates the
catalogue, so the grid, the product page and the institucional pages are
`caller` reads that ship no dehydrated cache; the Cart, the Wishlist control and
the reviews island are the exceptions that do. The test above is unchanged —
only what its first column evaluates to.

**ADR-0031 settles how the shop caches**, and it constrains the read path
enough to belong here. `cacheComponents` is off, so `use cache`, `cacheLife`
and `cacheTag` do not exist in this repo and a Request-time read dynamises its
whole route — `<Suspense>` buys streaming, never a static shell. The shop
therefore caches **rendered routes** with ISR, never queries. `unstable_cache`
is **banned**; `revalidatePath` is the only invalidation lever, because a tag
needs a `fetch` or an `unstable_cache` call and this repo's reads are Drizzle
through a procedure (ADR-0010). There is no time-based `revalidate` floor, so
an Admin write that changes a shop route owes it a `revalidatePath` call.

**ADR-0035 says which routes that is, and the answer is smaller than it
sounds.** The catalogue reads its filters, sort and pagination from
`searchParams`, which is a Request-time API, so `/produtos` and
`/produtos/[...categoria]` are dynamic and hold no cache entry to invalidate.
`/produto/[slug]` prerenders through a `generateStaticParams` that returns an
empty array — nothing at build, every page cached after one visit — and it stays
static only while it reads no `searchParams`, no `cookies()` and **no
`protectedProcedure`**, which reads headers where `baseProcedure` does not.

So the whole invalidating surface is `/` and `/produto/[slug]`. **ADR-0036**
holds the table, derived from one rule: the obligation follows what a write
changes on the shop, never which module the write lives in — which is why Review
moderation, in the reviews module, owes `/produto/<slug>` a call.

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

**It is now the shop's, and the shop made it** — ADR-0033 fixes a Product's
shop-facing price as `min(variant.price_amount)`. This paragraph is unchanged
for admin: an Admin's question about price is about a *Variant*, which is a row
in the form and not a column in the catalog.

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

### The shop's list input

That mapping now exists, and this is its shape. The shop cannot have admin's
identity between schema key and parameter name: ADR-0005 makes the URL
Portuguese and `AGENTS.md` makes every identifier English, so one of the two has
to give. **The schema keys stay English and the map is explicit.**

`modules/products/shop/schemas.ts` holds `catalogParamsSchema` with English
keys, a `CATALOG_PARAMS: Record<keyof CatalogInput, string>` beside it
holding the Portuguese strings, and `parseCatalogParams` renaming through the
map before it parses. That constant is what `PaginationNav`'s `paramKey`,
`buildSortHref` and every `FilterSpec`'s `key` read — which is precisely why all
three already take the key as an argument rather than assuming a vocabulary.

The home page adds `promotion` mapped to `promocao`. Only the literal public
value `1` enables it; every other value parses as absent. It selects Products
whose price-driving lowest-priced Variant has
`compareAtPriceAmount > priceAmount`, so every result's shared card can prove
the promotion without a second pricing rule.

It is a **second schema, not a reuse** of `productListParamsSchema`. "Paginated,
and includes `draft` and `archived`" is a sentence only the admin can say, and
the shop's price range has no admin counterpart at all. Both live in their
audience's folder for the reason the section above gives.

**`?busca=`, not `?q=`.** An older draft of `docs/STOREFRONT.md` had the search
parameter as `q`, alone among four Portuguese siblings; ADR-0005's own argument
against a storefront that looks translated applies to a parameter as much as to
a segment.

**`catalog`, not `catalogue`, in every identifier.** These names were first
recorded here as `catalogueParamsSchema` / `CATALOGUE_PARAMS` /
`CATALOGUE_SORTS`, which put a second spelling of one noun into a codebase whose
glossary heading is **Catalog** and whose files are `db/schema/catalog.ts` and
`components/catalog-image.tsx`. `CONTEXT.md` opens by promising that every term
means exactly one thing "in code, in issues, and in conversation", and two
spellings is that promise broken. The identifiers were corrected before any of
them existed as code, which is why this cost three lines rather than a schema
rename. **Prose is unaffected** — "the catalogue" stays ordinary English
throughout these documents; the rule binds identifiers and glossary terms, which
is where the promise actually bites.

#### The default sort is a function of `busca`

`relevancia` is the default when `busca` is present, and `recentes` otherwise. It
is the same `.transform()` that falls `relevancia` back when there is no search,
run in the other direction, and it uses admin's existing precedent: resolving the
value inside the schema makes it a property of the parsed object, so the client
cannot compute a divergent query key because it never computes one. A text search
ordered by recency is a worse search, and `plainto_tsquery('portuguese', …)` over
`product_search_idx` — what `products.admin.list` already issues — computes the
match regardless, so `ts_rank` is the cheap thing to order by.

The visible edge: sorting by _relevância_ and then clearing the search leaves
`ordenar=relevancia` in the URL, the schema resolves it to `recentes`, and the
control reads the resolved value. No extra rule, and the query key cannot fork.

#### A contradictory range is a view, not an error

`?preco_min=500&preco_max=100` gets **no special handling** — no cross-field
`.refine()`, no swap. ADR-0014 is per-field `.catch()` for a reason, and a range
that selects nothing is a view that selects nothing, which ADR-0041 already
answers with an empty state. Swapping them would guess at intent; rejecting them
would 400 a URL a shopper typed.

#### `CATALOG_PER_PAGE` is 24, and it is not `PRODUCTS_PER_PAGE`

24 is divisible by 2, 3 and 4, so the grid has no ragged final row at any width;
`PRODUCTS_PER_PAGE` is 20 because that is what the admin table is built for. The
argument above — a page size is a **layout** decision — applies twice here, to
two layouts, and lands on two numbers. Sharing one constant would couple an admin
table's row count to a shop grid's column count, so that changing the table would
silently reflow the storefront. It stays a constant and never a parameter, for
admin's unchanged reason.

#### One `ordenar`, where admin has two

Admin splits `sortBy` and `sortOrder` so that a garbage direction costs only the
direction. **The shop takes one parameter**, because its five options are not a
field × direction matrix: *relevância* has no direction and is offered only when
`busca` is present, and *menor preço* / *maior preço* are one field twice. Split,
a shopper could construct `?ordenar=relevancia&direcao=desc`, which means
nothing.

So `?ordenar=` is a closed enum in Portuguese — `relevancia`, `recentes`,
`menor-preco`, `maior-preco`, `avaliados`, `maior-desconto`,
`mais-vendidos` — and `CATALOG_SORTS` maps each to an English
`{ sortBy, sortOrder }` pair, through the same seam the keys use. The
schema sees `busca` and `ordenar` together, so it is also what falls `relevancia`
back to the default when there is no search to be relevant to.

The divergence is deliberate: admin's two parameters serve an internal surface
where a hand-edited URL should degrade field by field, and the shop's one
parameter serves a closed set of choices a shopper picks from a control.

`maior-desconto` requires `promocao=1` to describe the home section's full
view. It orders the relative reduction from the price-driving Variant largest
first, then Product creation newest first, then id. Without the promotion
filter it remains a valid view and places Products with no reduction after
those with one.

#### Best-selling stays one database query

ADR-0047 adds `mais-vendidos` without changing the list envelope or the card
row. `orders/server/sales.ts` owns an unexecuted per-Variant relation carrying
only Variant identity and sold units; `products.shop.list` joins it to Variants,
aggregates to one total per Product, and applies every catalogue predicate
before `LIMIT` and `OFFSET`.

This is intentionally not route composition. Two executed calls cannot preserve
both boundedness and correctness: limiting Variants before the Product aggregate
mis-ranks a Product whose sales are spread across Variants, while applying
Product filters after a global ranking produces short or incorrect pages. The
relation crosses the server boundary still unexecuted so the database remains
the compositor.

Selecting the sort keeps zero-sale Products with a score of zero and therefore
does not change `total`. The home page's separate
`products.shop.bestSellers({ excludeProductIds })` read is bounded to four
`ProductCardRow` values and requires a positive score, because an unsold Product
must not be labelled a best seller. Both are `baseProcedure` / `caller` reads;
sold units never cross into `ProductCardRow`.

#### Price is an aggregate

`?preco_min` and `?preco_max` are **reais** in the URL, converted to cents at the
schema seam, because `Money` is cents (`CONTEXT.md`) and no shopper types cents.
They filter on `min(variant.price_amount)` — ADR-0033 — so they are a `HAVING`
clause over a grouped query rather than a `WHERE` over a column, and that same
minimum is what *menor preço* sorts and what the card prints.

### The envelope

There is no shop-wide envelope, and inventing one would add a rule where the
existing one already answers. **The envelope follows the surface**: a list with a
`PaginationNav` returns `{ items, total }`, and a list ADR-0025 leaves
unpaginated returns a bare array — exactly the rule `categories.admin.list`
already follows.

Applied: `products.shop.list` paginates, so it carries `total`, counted over the
grouped query as a subquery because ADR-0033's `HAVING` makes the admin's flat
`count()` unavailable. `brands.shop.options` and `categories.shop.roots` are
bounded, so they are bare arrays.

The four home reads — `products.shop.promotions`, `bestSellers`, `newest`, and
`topRated` — are also bare arrays. Each has a hard limit of four and accepts no
pagination. The latter three accept `excludeProductIds`, apply the exclusion
before their ranking limit, and thereby backfill the page's no-duplicate
contract. The route owns their sequence; the Products module owns each ranking.

`reviews.shop.list` is the one to look at twice: ADR-0004 denormalises
`product.ratingCount`, and the product page has read it before it ever asks for
reviews — so a `total` there would be a second count of rows the page can already
count. That is an observation for the surface that specifies the reviews island,
not a rule fixed here.

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

The bar sits in `page.tsx` and **outside** the Suspense boundary: it is shell
rather than data, and a filter change must never replace the control that made
it. The dimming class is on the wrapper around the boundary, so exactly one
element in the tree knows about `data-pending`.

It is shell, but on this route it is not *instant* shell: the page `await`s the
two `options` calls the bar needs, so the heading and the skeleton wait on them
too. That is the cost of a composing route, it is two indexed reads of tens of
rows, and it is worth naming rather than hiding — the moment either list is
large enough to feel, the filters that read it become a search procedure and the
bar gets its own boundary.

**The table is a client component, and so is the bar** (issue #31, recorded as
an amendment to ADR-0016). The table reads its rows with `useSuspenseQuery`
against the query the page prefetched, because ADR-0011 prefetches and hydrates
a query **if and only if** a client component reads it — and because every row
action is specified as an `invalidateQueries` that only refetches queries a
mounted component is observing. A list whose rows carry a **status action**
(publish, archive, moderate) adds a third, `<name>-row-actions.tsx`, a leaf
taking an `id` and a `status`.

The property that survives all three, and the one ADR-0016 actually measured:
**no row array crosses the boundary as a prop, and no table is config-driven.**
The rows reach the browser as a dehydrated cache instead — the same bytes, a
different mechanism — so a list ships its rows once as markup and once as cache.
Sort headers stay anchors and pagination stays hrefs regardless.

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

> **Narrowed by ADR-0044: one _control set_ owns every write.** The sentence
> below was true of admin because admin has one arrangement. The shop needs a
> different one — a mobile `Filtrar` Sheet with **Ordenar outside it**, and a
> price range writing two parameters in one navigation — so the file splits:
> `FilterSearch`, `FilterSelect` and a new `FilterRange` keep every rule in this
> section, and each audience owns a thin component that arranges them. The rules
> are what must not be duplicated, because each fails silently; layout is not
> part of the declaration, which is the same test ADR-0016 applies to a column
> spec. Two consequences for callers: `buildFilterHref` takes
> `values: Record<string, string | null>` rather than one `key`/`value` pair, and
> **on the shop, sort is a filter** — `?ordenar=` is written through
> `buildFilterHref`, so *Sort is a link, not a control* below keeps admin and
> gains no shop caller.

**No component calls `useQueryParam` or `router.replace` directly.** One shared
component — `components/filter-bar.tsx` — owns every filter write on every admin
list, and the module supplies only a **spec**:

```tsx
// modules/products/admin/filters.ts
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
server/client boundary as an ordinary prop. A *column* spec cannot — `cell` is a
function — which is the whole of ADR-0016 in one sentence, and the reason the
table is markup the module writes itself.

The table being a client component does not soften that test, and reading it as
"the boundary moved, so a column spec could cross now" gets it backwards. A
config-driven table fails because the **declaration** would have to be
`"use client"` and every surface's columns would live in the browser as
functions; a hand-written client table ships its columns as the markup they
already are. What is shareable is decided by what the declaration is made of,
never by which side the component ended up on.

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

> **This is an admin rule, and ADR-0044 says why.** The argument below is about
> a **sortable column header in a table**, and the shop's grid has none to hang
> an anchor on. The catalogue's five `?ordenar=` options are a closed enum a
> shopper picks from a control, not a field × direction matrix — so the shop
> writes `ordenar` through `buildFilterHref` like any other filter, drops
> `?pagina=` through the same `resetKeys`, and `buildSortHref` gains **no shop
> caller at all**. Reaching for it there to "restore consistency" would be
> restoring the wrong one.

`lib/utils/pagination.ts` opens by saying pagination is a navigation, not a
state change, and `PaginationNav` ships no JavaScript. **A sortable column
header is the same shape**: a sorted list is a URL, and the current sort is
computable from the `input` prop the page already passes down. The toggle rule —
clicking the active column flips its direction, clicking a new column starts at
that column's own default — is pure.

So sort headers are anchors, the header row ships no click handler even though
the table around it is a client component, and the whole sort surface is free,
shareable and middle-clickable. It needs a
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
nav, heading, filter bar — that per-section Suspense exists to deliver. A page
awaits only its own `load` calls and whatever a composing route reads through
`caller` (all three products routes await the same two `options` queries — the
edit form's selects need them as much as the list's filter bar does), so the
shell is available in one round trip and only the data sections need to show
anything.

### Which is a case of one rule, not a ban (ADR-0040)

What bans the file here is not "no `loading.tsx`" — it is *do not throw away a
shell you have*. Stated generally:

> A dynamic segment shows a fallback while it waits. It uses **`<Suspense>`** if
> anything on it is prefetched, and **`loading.tsx`** if the page awaits
> everything. A static segment uses neither.

Admin is the first branch on every route, which is why it has none of these
files. The shop lands on both: ADR-0032 makes a shop read a `caller` call by
default, so the catalogue awaits everything and takes `loading.tsx`, while
`/carrinho` prefetches the Cart and takes a `<Suspense>` for admin's own reason.
`(account)` is mixed and resolves per segment.

The second branch is not free-standing preference — without Cache Components a
static route is prefetched whole, while **a dynamic route is not prefetched at
all** unless it has a `loading.js` boundary. So the file is a gain on a dynamic
`caller` route and a regression on a static one, which is why it never appears
above a static segment.

Two consequences the shop carries and admin does not. A `<Suspense>` **requires
a `prefetch` above it** — a boundary around already-awaited data buys nothing —
so on the shop it appears only where ADR-0032 hydrates. And a `loading.tsx`
above a `notFound()` makes it a **soft 404**, because the fallback starts the
stream before the call is reached; ADR-0040 accepts that on the catalogue and
keeps `/produto/[slug]` static so its 404 stays real.

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

The asymmetry with the write path (`docs/WRITE-PATH.md`) is deliberate: **reads resolve to "absent",
writes resolve to "refused"**. Mutations keep real `TRPCError` codes.

**What decides which rule applies is where the thing is addressed** (ADR-0041).
A **path** segment names a resource, and a missing resource is a 404. A **query
string** names a view over a list, and a view selecting nothing is an empty
state. Admin never had to say this because it addresses every resource by `[id]`
and every view by a query parameter, so the two lined up; the shop's catalogue
addresses a Category in the path and its filters in the query string, and must
produce both absences in one render — `/produtos/nao-existe` is a 404,
`/produtos/audio?marca=<gone>` is an empty catalogue.

The same clause resolves a trap on the shop's own read path. `cart.user_id` is
`not null unique` and there is no guest Cart (ADR-0034), so a shopper who has
added nothing has no `cart` row — and `null` read literally would 404
`/carrinho` for every new account. **`cart.get` therefore never returns `null`**;
it returns an empty Cart without creating the row. `/carrinho` addresses the
shopper, not a Cart, and `CONTEXT.md` already said a Cart is permanent.

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
