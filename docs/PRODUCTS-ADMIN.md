# The products admin module

The exemplar. Every rule in `docs/MODULES.md`, `docs/DATA-FLOW.md` and
ADR-0008 through ADR-0020 applied to one module, deeply enough that the other
eight admin modules are execution and not decisions.

Products was chosen because it is the hardest surface in the store: a Product is
an aggregate of four tables (ADR-0001), it carries images that upload before the
row exists (ADR-0018), it holds two denormalised columns another module
maintains (ADR-0004), and it has the richest filter set in the admin. An
architecture that survives it survives brands.

**This file was a specification; it is now a report of code.** The module is
built — #24 through #29 — and this file has been read end to end against it and
corrected wherever the build proved it wrong (#30). Where a sentence here and
the code disagree from here on, the sentence is the one that is wrong.

One divergence is **not** corrected here, because it contradicted an ADR rather
than this file: whether an admin list table is a client component or a server
one. It was raised as #31 and settled there, and ADR-0016 carries the amendment.

What generalises out of this file is the **"The template"** section of
`docs/MODULES.md`. Read that first if you are building one of the other eight.

## The surface at a glance

```
modules/products/
  schemas.ts          the Product's own vocabulary — one schema, both audiences;
                      and the image upload's own rules, which are that schema too
  status.ts           the pure transition rule
  constants.ts        page size, sort fields and their default directions, the
                      three statuses and their pt-BR labels, the blank form rows
  server/
    router.ts         createTRPCRouter({ admin: adminRouter })
    admin.ts          list · byId · create · update · publish · archive
                      createImageUpload · discardImageUpload
    queries.ts        the slug and SKU lookups create and update share
    rating.ts         recalculateProductRating — called by reviews (ADR-0020)
  admin/
    schemas.ts        the list params schema and parseProductListParams (ADR-0014)
    filters.ts        the FilterBar spec
    form-values.ts    byId's aggregate as the form's defaultValues, and where an
                      Image's Variant index lands when that Variant is removed
    upload.ts         putWithProgress — the XHR ADR-0018 forces
    components/       9 files
    hooks/            7 files
```

**No `types.ts`** — every type infers, from Zod or from `RouterOutput`.
**No `components/` or `hooks/` at the module root** — nothing is
shared across audiences yet. **No `shop/`, no `server/shop.ts`** — the shop's
surfaces are out of this map's scope, and the anatomy is lazy: they appear when
something needs them.

## Procedures

All eight are `adminProcedure` (`trpc/init.ts`), composed as
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
`tsvector`, through `plainto_tsquery` — so whatever an Admin typed is a query
and never a syntax error. The sort carries a second term the spec did not name:
`asc(product.id)` after the chosen column, because uuidv7 ids sort by creation
and a page boundary needs a stable tie-break. **A list always succeeds**: a `categoryId` that no longer exists
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

Every column but one: the generated `searchVector` is the name and the
description over again and nothing on the page reads it, so `columns` excludes
it. That single exclusion is also why `ProductDetail` is inferred from the
procedure and never from the table.

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

Before any of it, and **outside** the transaction: every key is `stat`ed
(`assertImagesUploaded`). A round trip per image has no business holding a write
open, and a refusal there has written nothing. The slug and SKU lookups run
inside, because they have to see what this write has done so far.

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
`cause: { field: "variants" }` — checked **before** the write, so a refused
deletion costs nothing. The Images reconcile as well, and not for the Variants'
reason: nothing references a `product_image` row, so replace-all would be legal
and is still wrong, because churning ids to save a diff rewrites the whole
gallery every time someone fixes a typo in alt text.

A row that no longer exists is a `NOT_FOUND`, thrown from the transaction's own
first read — the one place in this module where a *write* answers absence, and
the asymmetry `docs/DATA-FLOW.md` names: reads resolve to "absent", writes
resolve to "refused".

Images whose keys leave the array have their S3 objects deleted **after the
commit**, not inside the transaction. This is the correction ADR-0018 records
under that heading, and it is the one thing about this write that reads wrong
until it is said: `client.delete` cannot roll back, so deleting inside would
leave a rolled-back Product pointing at objects that are gone — a broken
photograph on the shop, which is the failure orphans are spent to avoid. After
the commit the same failure leaves an unreferenced object, which ADR-0018
already tolerates, so it is swallowed.

One edit the ordering cannot rescue: **two Variants swapping SKUs.** Deletions
run first so a freed SKU is available to a row the same save adds, but the
unique index is checked per statement, so the first update collides with the row
the second has not written yet. The transaction rolls back under the generic
pt-BR toast.

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
.input(imageUploadSchema)               // { contentType, size }, modules/products/schemas.ts
.mutation(): Promise<{ key: string; url: string }>
```

ADR-0018 in full. Mints `products/<uuidv7>.<ext>` server-side so no client can
escape the prefix, and presigns a PUT good for ten minutes. The browser uploads
with `XMLHttpRequest` for determinate progress; `create` and `update` `stat`
every key they are given, which is the real size and type guard and also catches
a key that was never uploaded.

The `stat` is not the only thing on the way back in: a key that does not match
`isProductImageKey` is refused before anything is looked up, so a payload cannot
name an object this uploader never minted. That refusal, and every other one
here, names `images.<i>.s3Key` — the tile that caused it, rather than a toast
the Admin has to match to a photograph by hand.

**Neither half of the input binds anything into the signature**, and the second
half is a correction to what ADR-0018 implied. `presign` has no
`content-length-range`, which that ADR says; it also signs no `Content-Type`
header on a query-signed URL, so S3 accepts a PUT whose header contradicts the
one the URL was minted for — verified against the bucket. The `type` option
decides what the stored object will be *called*, and the `stat` decides whether
the write accepts it.

### `discardImageUpload`

```ts
.input(z.object({ key: z.string() }))
.mutation(): Promise<{ discarded: boolean }>
```

The object behind a tile removed before the Product was ever saved with it —
"removing an image from the form deletes its object then and there", which
ADR-0018 decided and left without a name. **Not in that ADR's procedure list,
and needed by its own decision**: a browser cannot delete an S3 object, and
`createImageUpload` mints a URL for one verb.

Two things keep an admin-only delete-by-key narrow. The key must match the
shape this app mints (`isProductImageKey`), so nothing walks out of the prefix;
and **a key any `product_image` row references is refused**, which confines it
to uploads that were never persisted — a persisted Image's object dies with the
`update` that drops its key.

It never throws for a failed delete. The Admin asked to remove a tile, not to
clean a bucket, and what is left behind is exactly the orphan ADR-0018
tolerates.

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
one place — and the pt-BR messages are in it, so the sentence under a field is
the sentence the procedure would have refused with.

**The image upload's own vocabulary is in this file too**, which this file did
not foresee and the build settled: `PRODUCT_IMAGE_CONTENT_TYPES`,
`PRODUCT_IMAGE_MAX_BYTES`, `PRODUCT_IMAGE_EXTENSIONS`, `imageUploadSchema`,
`checkImageUpload` and `isProductImageKey`. They are not in `constants.ts`
because they *are* the schema — one list of accepted types and one ceiling
serving `createImageUpload`'s `.input()`, the browser's pre-flight check and the
write's `stat`, at once. `checkImageUpload` takes a `{ type, size }` rather than
a `File`, which is what keeps the browser's vocabulary out of it and `bun test`
inside.

`modules/products/admin/schemas.ts` — the **list params schema** and
`parseProductListParams` beside it (ADR-0014). Its `.transform` resolves
`sortOrder` from `PRODUCT_SORT_DEFAULTS`, which is what makes the per-field
default a property of the parsed object and keeps the schema idempotent — a
resolved direction parses back to itself, so one schema can parse the URL and
validate the procedure's input. It lives in the audience folder
because "paginated, and includes `draft` and `archived`" is a sentence only the
admin can say.

**Types are inferred, all of them.** `ProductFormValues` is
`z.infer<typeof productSchema>`; `ProductListInput` is
`z.infer<typeof productListParamsSchema>`; a row is
`RouterOutput["products"]["admin"]["list"]["items"][number]`. The module exports
no `$inferSelect` row — a type that tracks the table goes stale the first time a
procedure selects a subset.

`constants.ts` at the root holds `PRODUCTS_PER_PAGE`; `PRODUCT_SORT_FIELDS` and
`PRODUCT_SORT_DEFAULTS` (per-field default directions — `name` asc,
`ratingAverage` desc, `createdAt` desc); `PRODUCT_STATUSES`,
`PRODUCT_STATUS_LABELS` and the `PRODUCT_STATUS_OPTIONS` built from them; and
the blank form rows — `EMPTY_VARIANT`, `EMPTY_SPECIFICATION` and `NEW_PRODUCT`,
which `/admin/products/new` opens with. The last three are here rather than as
object literals in a `.tsx` because the field arrays and the create wrapper's
`defaultValues` would otherwise each keep their own copy of one shape.
`ProductStatus` and `ProductSortField` are inferred from those two lists, so the
module's only status type is the one the constants already declare.
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
const AdminEditProductPage = async ({
  params,
}: PageProps<"/admin/products/[id]">) => {
  await requireAdmin();
  const { id } = await params;

  const [product, brands, categories] = await Promise.all([
    load(trpc.products.admin.byId.queryOptions({ id })),
    caller.brands.admin.options(),
    caller.categories.admin.options(),
  ]);

  if (!product) notFound();
```

`load`, not `prefetch`: the heading needs the name **and** the form reads the
same query with `useSuspenseQuery`, so one fetch serves both consumers. `null`
becomes `notFound()` in `page.tsx`, where ADR-0006 already puts `requireAdmin()`.

Two things this file did not have before the build. The generated `PageProps` **is** used here —
it types `params`, which is all this route needs; it is only `searchParams` on
the list page that it leaves untyped. And the edit route is a composing route
too: the form's Brand and Category selects need the same two `options` calls the
list page makes, so all three reads run in parallel and none waits on another.

The form takes the `id` and reads `byId` itself rather than receiving the
Product as a prop. That is what makes `load` the right helper rather than a
contradiction of it — a client component reads the query, so ADR-0011 hydrates
it — and it is why saving adds `router.refresh()`: the `<h1>` above the form was
rendered on the server from the RSC copy, which no invalidation reaches.

No `loading.tsx`, no breadcrumbs, and the page owns its own heading and
"Voltar" — ADR-0015.

## UI

Nine components, all in `modules/products/admin/components/`.

| File | Kind | Composes |
| --- | --- | --- |
| `product-table.tsx` | **client** | `TableShell`, `SortHeader`, `EmptyRow`, `PaginationNav`, `useSuspenseQuery` |
| `product-table-skeleton.tsx` | server | `components/ui/skeleton` |
| `product-row-actions.tsx` | **client** | `Button`, the publish/archive hooks |
| `product-form.tsx` | client | shadcn `Field`, `useProductImages`, the three field groups below |
| `product-create-form.tsx` | client | `product-form` |
| `product-edit-form.tsx` | client | `product-form`, `useSuspenseQuery` on `byId` |
| `variant-fields.tsx` | client | `useFieldArray`, and `dropVariant` as it removes a row |
| `specification-fields.tsx` | client | `useFieldArray` |
| `image-fields.tsx` | client | the tiles and their bars, over a `ProductImages` prop |

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
`defaultValues`, `onSubmit`, `isPending`, a `submitLabel` and the two option
sets, and renders every field; the create and edit wrappers are a few lines each
and differ only in which hook they fire and where they navigate. A `mode` prop
branching inside one component would put a rule in a `.tsx`, which
`docs/CONVENTIONS.md` forbids.

`onSubmit` is `(values, form)` rather than `(values)`. The wrapper needs the
form back to turn `error.data.field` into `form.setError`, which is the one
call-site `onError` ADR-0013 leaves to the surface — and handing it over is what
keeps the body from owning an error path that differs per owner.

`image-fields.tsx` is fed by `product-form.tsx` rather than calling
`useProductImages` itself: the hook has a second reader one level up, since
submit is disabled while `isUploading`. One prop, `images: ProductImages`,
rather than the nine callbacks the hook returns.

`useWatch({ control })` rather than `form.watch()` — the latter opts a component
out of the React Compiler.

## Hooks

Seven, in `modules/products/admin/hooks/`. **Six** are one per write, named for
the verb: `use-create-product`, `use-update-product`, `use-publish-product`,
`use-archive-product`, `use-create-image-upload` and
`use-discard-image-upload`.

`use-product-images` is the exception, and the exception is ADR-0018's. It owns
the images field array *and* the files still going up to it — pick, check,
presign, PUT, append, retry, cancel, reorder, remove — because that is rule and
sequence, which a `.tsx` may not hold. `product-form.tsx` calls it rather than
`image-fields.tsx`, because the submit button is its second reader: submit is
disabled while any upload is in flight.

Two of its responsibilities went unnamed until the build, and both are the cost of
ADR-0019's indices and ADR-0018's orphans, paid at the only place that can see
them:

- **`dropVariant`.** A tile names its Variant by position, so removing a Variant
  re-points every photograph above it. `VariantFields` calls this as it removes
  a row, and `variantIndexAfterRemoval` in `form-values.ts` is the rule it
  applies — a shot of the Variant that just left becomes a shot of the Product
  as a whole. `setValue` per tile rather than `replace`, which would remount the
  tiles and take half-typed alt text with them.
- **Discarding what nobody kept.** A cancelled tile, a tile whose PUT failed
  after S3 stored the object, a tile the unmount abandoned mid-transfer, and a
  never-persisted Image removed from the array all fire `discardImageUpload`.
  Each is an orphan this code can see, and ADR-0018 takes exactly those.

**A file becomes a form value only once its bytes are in the bucket.** Until
then it is a `PendingUpload` held here, with its own preview, bar, pt-BR error
and — for a failed transfer, never a refused type or size — its own retry. That
is what keeps `images` a list of keys that certainly exist.

The two upload hooks own **neither** of the two things below. There is nothing
to invalidate — minting a URL changes no row — and a success toast per
photograph, on a form where six is normal, is noise. So "one hook per write owns
invalidation and the success toast" is the rule with two exemptions in this
module, and the exemption is worth stating rather than leaving as a gap.

Every other hook owns exactly two things — **invalidation and the success
toast** — and nothing else:

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

Four files, and ADR-0017 is what makes the list short: a test follows a rule.

- `tests/modules/products/status.test.ts` — the transition rule. Which of
  publish and archive is legal from each of the three statuses.
- `tests/modules/products/admin/schemas.test.ts` — ADR-0014's claims:
  `parse` cannot throw, garbage becomes defaults, unknown keys are stripped, an
  array value falls to its default, and each `sortBy` gets its own default
  direction.
- `tests/modules/products/admin/form-values.test.ts` — that an Image names its
  Variant by index, that every child's id is carried back, and that the
  aggregate round-trips into values the write's own schema accepts (ADR-0019).
  Also `variantIndexAfterRemoval`, which arrived with the build: the four cases
  a removed Variant leaves a tile in.
- `tests/modules/products/schemas.test.ts` — **narrowly**: `variants.min(1)`
  (`CONTEXT.md`: every Product has at least one Variant), the two duplicate-row
  refusals — including that two labels differing only in case are *accepted*,
  because the database's index is exact too — `altText` non-empty, and the upload's own rules — what may be
  uploaded and how big, and that a key from a client is recognised as one this
  app minted or refused (ADR-0018). Not `name.min(1)`; that tests Zod.

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
- **No repository, no service layer.** ADR-0010: Drizzle's relational builder is
  the query layer, and `server/queries.ts` holds the two lookups `create` and
  `update` both ask — arguments in, rows out, and it arrived with the second
  caller rather than before one.
- **No optimistic updates.** App-wide, ADR-0012's file.
- **No `reorder` procedure.** Arranging the images is a client-side array move,
  saved by the same submit as everything else; `position` is derived from the
  index at write time and never sent (ADR-0018).
- **No orphan sweep, and no `pending/` prefix.** ADR-0018 tolerates the orphans
  an abandoned form leaves. The reopening trigger is a scheduled runner.
- **No `remove`.** A Product archives; `docs/MODULES.md` notes that `delete` is
  usually a lie in this domain. The only `remove`-shaped acts here are a
  Variant, a Specification or an Image leaving a form array, which is a field
  edit and not a write — `discardImageUpload` deletes an object, never a row.
  A Variant an Order references is where that field edit is refused, and it is
  refused by `update` at submit rather than by the button.
- **No confirmation dialog.** Nothing this module does is un-undoable from the
  same screen — archive is reversible by filtering, and removing an Image is a
  field edit (ADR-0018).
- **No barrel.** Callers deep-import; the folder layout is the API.
- **No module middleware.** `docs/MODULES.md` permits a `productProcedure` that
  loads a row and throws `NOT_FOUND` so five procedures need not each repeat it.
  Three procedures here read before deciding — `publish`, `archive` and `update`
  — and two of them want a `status` rather than a row, so it never reached the
  caller count that would earn it. `readStatus`, a plain function, arrived
  instead.
