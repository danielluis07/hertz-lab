# The products admin module

The exemplar. Every rule in `docs/MODULES.md`, `docs/DATA-FLOW.md` and
ADR-0008 through ADR-0020 applied to one module, deeply enough that the other
eight admin modules are execution and not decisions.

Products was chosen because it is the hardest surface in the store: a Product is
an aggregate of four tables (ADR-0001), it carries images that upload before the
row exists (ADR-0018), it holds two denormalised columns another module
maintains (ADR-0004), and it has the richest filter set in the admin. An
architecture that survives it survives brands.

**This file is a specification, not a report of code.** None of it is built; the
map that produced it ships no production code.

What generalises out of this file is the **"The template"** section of
`docs/MODULES.md`. Read that first if you are building one of the other eight.

## The surface at a glance

```
modules/products/
  schemas.ts          the Product's own vocabulary — one schema, both audiences
  status.ts           the pure transition rule
  constants.ts        page size, sort defaults, status options
  server/
    router.ts         createTRPCRouter({ admin: adminRouter })
    admin.ts          list · byId · create · update · publish · archive · createImageUpload
    rating.ts         recalculateProductRating — called by reviews (ADR-0020)
  admin/
    schemas.ts        the list params schema (ADR-0014)
    filters.ts        the FilterBar spec
    components/       9 files
    hooks/            5 files
```

**No `types.ts`** — every type infers, from Zod or from `RouterOutput`.
**No `server/queries.ts`** — ADR-0010 creates it on the second caller, and there
is not one. **No `components/` or `hooks/` at the module root** — nothing is
shared across audiences yet. **No `shop/`, no `server/shop.ts`** — the shop's
surfaces are out of this map's scope, and the anatomy is lazy: they appear when
something needs them.

## Procedures

All seven are `adminProcedure` (`trpc/init.ts`), composed as
`trpc.products.admin.*`. `docs/MODULES.md` nests the audience inside `server/`,
which also gives invalidation its hierarchy: `trpc.products.pathFilter()`
reaches both audiences, `trpc.products.admin` reaches one.

### `list`

```ts
.input(productListParamsSchema)          // modules/products/admin/schemas.ts
.query(): Promise<{ items: ProductListItem[]; total: number }>
```

Input is ADR-0014's schema — the same object that parsed the URL. Fields:
`search`, `status`, `categoryId`, `brandId`, `sortBy`, `sortOrder`, `page`.
`perPage` is not an input; it is `PRODUCTS_PER_PAGE` in the module's constants.

`total` is the count before pagination, and it exists because `PaginationNav`
needs a page count. It is a second `count(*)` over the same `where`.

A row carries:

| Field | Source |
| --- | --- |
| `id`, `name`, `slug`, `status`, `ratingAverage`, `ratingCount`, `createdAt` | `product` |
| `brandName` | join `brand` — indexed FK |
| `categoryName` | join `category` — indexed FK |
| `variantCount`, `totalStock` | aggregate over `product_variant` |

**No thumbnail and no price**, and both omissions are deliberate. A price is
ambiguous under ADR-0001 — *which* Variant's? — which is the same reason
`docs/DATA-FLOW.md` refuses price as a sort key; a column an Admin cannot sort
by, showing a range, is a worse surface than no column. A thumbnail costs a
lateral join per row for decoration on a surface whose users know their own
catalog.

`search` runs against `product_search_idx`, the GIN index over the Portuguese
`tsvector`. **A list always succeeds**: a `categoryId` that no longer exists
yields `[]` and an empty state, never a 404 (`docs/DATA-FLOW.md`, "Absence").

### `byId`

```ts
.input(z.object({ id: z.string() }))
.query(): Promise<ProductDetail | null>
```

**Returns the whole aggregate** — the `product` row plus `variants[]`,
`images[]` and `specifications[]`, each ordered by `position` — through
Drizzle's relational `with:`. One query, because one React Hook Form needs one
`defaultValues` object; splitting it would make the form wait on two boundaries
or stitch them itself.

Returns **`null`**, never `NOT_FOUND`. The page turns that into `notFound()`.

### `create`

```ts
.input(productSchema)                    // modules/products/schemas.ts
.mutation(): Promise<{ id: string }>
```

One transaction. Writes the `product` row with **`status: "draft"`
unconditionally** — status is not in the payload — then the Variants, then the
Specifications, then the Images with their `variantId` indices resolved against
the ids the Variant inserts just produced (ADR-0019).

Returns the new row so the call site can `router.push('/admin/products/' + id)`.

### `update`

```ts
.input(productSchema.extend({ id: z.string() }))
.mutation(): Promise<{ id: string }>
```

One transaction that **reconciles** — ADR-0019. Child rows with an `id` update,
rows without insert, rows whose id did not come back are deleted; every
reconcile is scoped by `productId` so a foreign id can never be written across
aggregates. Specifications replace-all, for the unique-index reason ADR-0019
gives. Deleting a Variant an Order references is refused as a `CONFLICT` with
`cause: { field: "variants" }`. Images whose keys leave the array have their S3
objects deleted as part of the write (ADR-0018).

`status` is untouched here, and `slug` is an ordinary editable field with no
linkage to `name` — a slug is a public URL (ADR-0005), and silently rewriting it
on a typo fix breaks every link that was ever shared. On **create** the field
prefills from `slugify(name)` while the Admin has not touched it, which is form
behaviour and not a rule. A collision on `slug`, or on a Variant `sku`, surfaces
as `CONFLICT` naming its own field.

### `publish` and `archive`

```ts
.input(z.object({ id: z.string() }))
.mutation(): Promise<{ id: string }>
```

`publish` moves `draft | archived → active`; `archive` moves `draft | active →
archived`. The legality of a transition is `isPublishable` / `isArchivable` in
`modules/products/status.ts` — a pure rule, so the procedure orchestrates and
the rule is testable without a database (`docs/MODULES.md`, "Rules do not live
here"). An illegal transition is a `CONFLICT`.

**They exist instead of a `status` field on the form**, and that is
`docs/MODULES.md`'s domain-verb rule rather than a new decision: the form edits
what a Product *is*, a transition is what it *does*, it fires from a list row
where no form exists, and it carries its own toast copy. Neither confirms —
`docs/DATA-FLOW.md` already has `archive` as reversible-by-filtering. A side
effect worth having: since `create` always writes `draft`, a new Product cannot
go live by accident.

### `createImageUpload`

```ts
.input(z.object({ contentType: z.string(), size: z.number().int().positive() }))
.mutation(): Promise<{ key: string; url: string }>
```

ADR-0018 in full. Mints `products/<uuidv7>.<ext>` server-side so no client can
escape the prefix, and presigns a PUT. The browser uploads with
`XMLHttpRequest` for determinate progress; `create` and `update` `stat` every
key they are given, which is the real size and type guard and also catches a key
that was never uploaded.

### `server/rating.ts` — not a procedure

```ts
recalculateProductRating(tx: Transaction, productId: string): Promise<void>
```

Rebuilds `rating_average` (hundredths) and `rating_count` from the approved
`review` rows, from scratch, inside a caller-supplied transaction.

**It is the reviews module's trigger and the products module's rule.** ADR-0004
requires the recalculation to be atomic with the moderation, so it cannot be a
second procedure call; and it writes a `products` table, so it must not live in
`reviews`. ADR-0020 is what lets `modules/reviews/server/` import it. Nothing
else in the app may write those two columns.

## Schemas and types

**Two schema files, at two levels, and the split is `docs/MODULES.md`'s rule 1.**

`modules/products/schemas.ts` — the **entity's own vocabulary**, at the module
root because a Product means the same thing to both audiences. It holds
`productSchema` and its children (`variantSchema`, `specificationSchema`,
`productImageSchema`), each child carrying `id: z.string().optional()` for
ADR-0019's reconcile, and `productImageSchema.variantId` typed as
`number | null` — an **index into the form's variants array**, never a database
id, on create and update alike.

It serves the tRPC `.input()` **and** the React Hook Form resolver. One schema,
one place.

`modules/products/admin/schemas.ts` — the **list params schema** and
`parseProductListParams` beside it (ADR-0014). It lives in the audience folder
because "paginated, and includes `draft` and `archived`" is a sentence only the
admin can say.

**Types are inferred, all of them.** `ProductFormValues` is
`z.infer<typeof productSchema>`; `ProductListInput` is
`z.infer<typeof productListParamsSchema>`; a row is
`RouterOutput["products"]["admin"]["list"]["items"][number]`. The module exports
no `$inferSelect` row — a type that tracks the table goes stale the first time a
procedure selects a subset.

`constants.ts` at the root holds `PRODUCTS_PER_PAGE`, `PRODUCT_SORT_DEFAULTS`
(per-field default directions — `name` asc, `ratingAverage` desc, `createdAt`
desc) and `PRODUCT_STATUS_OPTIONS` with pt-BR labels.
`admin/filters.ts` holds `productFilters`, the `FilterBar` spec — a function
of the Brand and Category option sets rather than a constant, because two of its
four filters are rows the composing route reads per request
(`docs/DATA-FLOW.md`).

## Routes to surfaces

Three routes, and each names its fetching path per query (ADR-0011).

### `/admin/products`

```tsx
const AdminProductsPage = async ({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await requireAdmin();
  const input = parseProductListParams(await searchParams);

  prefetch(trpc.products.admin.list.queryOptions(input));
  const [brands, categories] = await Promise.all([
    caller.brands.admin.options(),
    caller.categories.admin.options(),
  ]);

  return (
    <HydrateClient>
      <div className="group">
        <h1>Produtos</h1>
        <FilterBar filters={productFilters({ brands, categories })} input={input} />
        <div className="group-has-data-pending:opacity-50">
          <Suspense fallback={<ProductTableSkeleton />}>
            <ProductTable input={input} />
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  );
};
```

The page types `searchParams` itself — Next's generated `PageProps` types
`params` but not `searchParams`. It normalises **once** and passes the object
down as a prop, so the client cannot build a divergent query key.

**The Brand and Category options are the route composing three modules**, which
is ADR-0008's rule 4 having its first real instance. They come through `caller`
because no client component reads them as a query — `FilterBar` receives them as
props — the bar sits in the page, outside the Suspense boundary, because it is
shell rather than data. Folding them into `list`'s return would weld an
unrelated payload onto every filter combination in the cache; fetching them from
inside `products` would put a brands query in the wrong module. See "The
`options` procedure" in `docs/MODULES.md`.

### `/admin/products/new`

`requireAdmin()`, the same two `options` calls, and `<ProductCreateForm />`.
Nothing to prefetch: there is no Product yet.

### `/admin/products/[id]`

```tsx
await requireAdmin();
const { id } = await params;

const product = await load(trpc.products.admin.byId.queryOptions({ id }));
if (!product) notFound();
```

`load`, not `prefetch`: the heading needs the name **and** the form reads the
same query, so one fetch serves both consumers. `null` becomes `notFound()` in
`page.tsx`, where ADR-0006 already puts `requireAdmin()`.

No `loading.tsx`, no breadcrumbs, and the page owns its own heading and
"Voltar" — ADR-0015.

## UI

Nine components, all in `modules/products/admin/components/`.

| File | Kind | Composes |
| --- | --- | --- |
| `product-table.tsx` | **client** | `TableShell`, `SortHeader`, `EmptyRow`, `PaginationNav`, `useSuspenseQuery` |
| `product-table-skeleton.tsx` | server | `components/ui/skeleton` |
| `product-row-actions.tsx` | **client** | `Button`, the publish/archive hooks |
| `product-form.tsx` | client | shadcn `Field`, the three field groups below |
| `product-create-form.tsx` | client | `product-form` |
| `product-edit-form.tsx` | client | `product-form` |
| `variant-fields.tsx` | client | `useFieldArray` |
| `specification-fields.tsx` | client | `useFieldArray` |
| `product-image-field.tsx` | client | `useFieldArray`, `useCreateImageUpload` |

The table owns its markup and its columns, and shares everything whose
declaration is **data** — ADR-0016's test. Its skeleton is a sibling file, not a
second export, because it knows this table's column count and widths.

**Two corrections to ADR-0016 fall out here.** That ADR says the filter bar is
the only client component on a list page, and that the table is a server
component. Neither holds on this surface.

`product-row-actions.tsx` is a second client component, because publish and
archive need an `onClick`. It is a leaf — a `<td>`'s worth of buttons receiving
an `id` and a `status` — and every module with a per-row status action has one.

`product-table.tsx` is the third, and that one was a decision rather than a
consequence: it reads its rows with `useSuspenseQuery` because ADR-0011 hydrates
a query if and only if a client component reads it, and because the row actions
above invalidate rather than refresh. Issue #31 settled it; ADR-0016 carries the
amendment. The property that ADR measured still holds — no row array crosses as
a prop, and the table is not config-driven — and the table still owns its
columns as markup.

**The form is one body and two owners** (ADR-0019). `product-form.tsx` takes
`defaultValues`, `onSubmit` and `isPending` and renders every field; the create
and edit wrappers are a few lines each and differ only in which hook they fire
and where they navigate. A `mode` prop branching inside one component would put
a rule in a `.tsx`, which `docs/CONVENTIONS.md` forbids.

`useWatch({ control })` rather than `form.watch()` — the latter opts a component
out of the React Compiler.

## Hooks

Five, in `modules/products/admin/hooks/`, one per write, named for the verb:
`use-create-product`, `use-update-product`, `use-publish-product`,
`use-archive-product`, `use-create-image-upload`.

Each owns exactly two things — **invalidation and the success toast** — and
nothing else:

```ts
return useMutation(
  trpc.products.admin.archive.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.products.pathFilter());
      toast.success("Produto arquivado.");
    },
  }),
);
```

`pathFilter()` on the **module**, not the audience: archiving a Product changes
what a shopper sees too. It reads blunt and behaves narrow —
`invalidateQueries` refetches only *active* queries.

**Errors need no hook.** The `MutationCache` handler toasts a pt-BR sentence for
every failed mutation, and stands down whenever `data.field` or `data.zodError`
says a form will render it (ADR-0013). The two forms add one call-site
`onError` that turns `error.data.field` into `form.setError`.

**Navigation is at the call site** — tier three. `create` pushes to the new
Product's detail page; `update` stays put and adds **`router.refresh()`**,
because the heading above the form was read on the server; `publish`/`archive`
from a list row invalidate and nothing more.

Row-scoped pending, always: one hook instance is shared by every row, so
`disabled={isPending && variables?.id === product.id}`.

There is **no `useProductFilters` hook**. ADR-0016 put every filter write inside
`FilterBar`, including "a filter change drops `page`".

## Tests

Three files, and ADR-0017 is what makes the list short: a test follows a rule.

- `tests/modules/products/status.test.ts` — the transition rule. Which of
  publish and archive is legal from each of the three statuses.
- `tests/modules/products/admin/schemas.test.ts` — ADR-0014's claims:
  `parse` cannot throw, garbage becomes defaults, unknown keys are stripped, an
  array value falls to its default, and each `sortBy` gets its own default
  direction.
- `tests/modules/products/schemas.test.ts` — **narrowly**: `variants.min(1)`
  (`CONTEXT.md`: every Product has at least one Variant) and `altText` non-empty
  (ADR-0018). Not `name.min(1)`; that tests Zod.

Not tested, and both because a rule already made it so: **`server/`** — every
procedure here, the nested write included, which ADR-0017 rejects **by name**;
and **`components/`**, which `AGENTS.md` allows only render logic.

The nested write is the most failure-prone code in this module and has no test.
ADR-0017 records that cost, and records what protects it instead: it is one
transaction, so there is no partial state to be wrong about. The reopening
trigger is CI and only CI.

## What this module does not have

Worth stating, because the other eight will be tempted:

- **No `types.ts`.** Everything infers.
- **No `server/queries.ts`.** ADR-0010 wants a second caller first.
- **No repository, no service layer.** Same ADR: Drizzle's relational builder is
  the query layer.
- **No optimistic updates.** App-wide, ADR-0012's file.
- **No `remove`.** A Product archives; `docs/MODULES.md` notes that `delete` is
  usually a lie in this domain. The only `remove`-shaped acts here are a Variant
  or a Specification leaving a form array, which is a field edit and not a write.
- **No confirmation dialog.** Nothing this module does is un-undoable from the
  same screen — archive is reversible by filtering, and removing an Image is a
  field edit (ADR-0018).
- **No barrel.** Callers deep-import; the folder layout is the API.
