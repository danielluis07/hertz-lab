# 18. Images upload before the row exists, and orphans are tolerated

Date: 2026-09-03

## Status

Accepted

## Context

ADR-0012 settled the mechanism and named what it left open. There are no Server
Actions, so an image reaches S3 as a **presigned PUT from the browser**: an
`adminProcedure` mints the URL, the file never transits the app server, and
`lib/s3.ts` stays behind the same guard as every other server capability. That
ADR closed with the problem it could not solve — "a file lands in S3 before the
row referencing it exists, or instead of it" — and handed it here.

The flow around the mechanism is genuinely undecided, and one constraint from
ADR-0016 governs all of it: **one form, one mutation**. A Product with no
Variant is invalid, so create cannot be staged; the whole aggregate is written
in one transaction. The question is what an image does on either side of that
write.

Two environment facts narrow the options before any preference does.

**Bun's `presign` signs one method and cannot cap a size.** It produces a
query-signed URL for a single verb, optionally binding `Content-Type` through
`type`. There is no POST-policy equivalent in the client, and a POST policy is
the only S3 mechanism that enforces `content-length-range` at upload time. Any
size limit the client is told about is a limit only the client obeys.

**`fetch` reports no upload progress.** The browser exposes bytes-sent only
through `XMLHttpRequest`. A percentage is therefore a choice of transport, not a
choice of component.

A third fact rules out the tidiest orphan story: Bun's S3 client has no
server-side copy, so "upload to `pending/`, move on write" streams the object
down and back up through the app server — the one thing presigning exists to
avoid.

## Decision

### Upload is eager; the key is the form value

The browser requests a presigned URL the moment a file is selected and PUTs it
immediately. The resulting **key** lives in React Hook Form state as an ordinary
field value, and submit is one plain mutation with no second phase.

The alternative — hold the `File` objects, `create` the row, then upload against
the new id — reintroduces one layer up exactly the failure the transaction
exists to prevent. The row would exist, the files would be in flight, and a
closed tab would leave a Product with no images and a form that cannot be
resumed. It also forks create from edit: on `/admin/products/[id]` the id
already exists, so edit would upload eagerly regardless, and the two surfaces
would run different code for the same act.

Eager upload buys orphans instead, which is a trade of a corrupt aggregate for
garbage.

### Order, alt text and Variant are form fields

`position` is **derived from the array index at write time**. The client never
sends a position number; reordering is a client-side array move, saved by the
same submit as everything else. There is no `reorder` procedure: a second write
path out of one form would mean dragging an image is saved while renaming the
Product is not.

`altText` is required per image. The column is `notNull` and exists for screen
readers, so an empty string is refused by the schema — which makes it a rule,
and by ADR-0017 a tested one. Auto-filling it from the Product name was
rejected: "Fone Bluetooth — imagem 2" read aloud is noise, and it makes the
column look populated while carrying nothing.

`variantId` is the sharp one. On create the Variants have no ids yet, so a tile
**references its Variant by index into the form's variants array**, and the
write procedure resolves index → inserted id *inside* the transaction. This is
the one place the form's shape and the database's shape do not line up, and it
differs between create (indexes) and update (real ids). An empty selection means
what the nullable column already means: the shot belongs to the Product, not to
one Variant.

### The procedure is `products.admin.createImageUpload`

It takes `{ contentType, size }` and returns `{ key, url }`. It mints the key
itself — `products/<uuidv7>.<ext>`, reusing the `Bun.randomUUIDv7()` that
`db/schema/columns.ts` already uses for ids — binds the MIME type into the
signature, and sets a short `expiresIn`. A client that cannot choose the key
cannot overwrite an existing object or escape the prefix.

The name follows ADR-0010: the domain verb wins over the mechanism, and
`createImageUpload` survives a later move to a POST policy without a rename.

`brand.logoS3Key` means brands is a real second uploader, but it cannot call
this procedure — ADR-0009 runs the dependency along the foreign key, and product
references brand, so brands may never import products. Each uploader owns its
own procedure over the one global `client` in `lib/s3.ts`. Nothing is promoted
today: ADR-0007 promotes on the second caller, and brands is not built.

### Validation is split, and the write is the real guard

The **client** checks type and size before asking for a URL, against constants
in the module's `schemas.ts` — the one file already serving both the tRPC input
and the RHF resolver. That is for feedback.

The **write procedure** `stat`s every key it is given and refuses one that is
missing, oversized, or the wrong type. That is the enforcement, and it also
closes a hole the presign cannot: a client that sends a key it never uploaded.

The size ceiling has no signature-level guard and is not pretended to have one.
The URL is minted only for an authenticated Admin, and an Admin determined to
put a large object in the bucket has easier routes.

### Orphans are tolerated

An orphan is an unreferenced object in a public bucket. It costs storage and
nothing else.

A sweep was rejected on the ground ADR-0017 already established: this repo has
no scheduled runner — no `.github/`, no cron of any kind — so a diff of bucket
keys against `product_image` rows would run when someone remembered, and a
sweep nobody runs is worse than no sweep because it reads as though orphans are
handled.

One mitigation is taken because it is free: **removing an image from the form
deletes its object then and there**, so the only orphans left are the ones
nobody could have observed.

**The reopening trigger is a scheduled runner, and only that.** Given one, the
sweep is a short job worth having.

### Removal is a field edit, not a confirmed write

`docs/DATA-FLOW.md` listed "an image" among the `remove` writes that gate
through `ConfirmProvider`. That table was written before this flow existed, and
it is corrected here.

Removing a tile is a **field edit**. It is undone by adding the file back, and
confirming it would mean confirming every array-field removal on the form —
Variants, Specification rows. For a key not yet persisted, the S3 object is
deleted immediately. For a persisted row, the `update` that writes an images
array no longer containing that key deletes the object as part of the write:
irreversible, but irreversible at **submit**, which is the confirmable act.

What is not done is leave the object behind. That would be a guaranteed orphan
on the one path where we can see it happening.

### Progress is real, and its failures are the form's

Each file shows a tile with a local `URL.createObjectURL` preview immediately and
a **determinate** bar over it, driven by `XMLHttpRequest`. An indeterminate
spinner was rejected: a product photo over a Brazilian connection is a spinner
sitting still for fifteen seconds. The "no optimistic updates" line does not
reach here — that decision was about rolling back a query cache, and a local
preview rolls back by being thrown away.

**Submit is blocked while any upload is in flight**, with the button disabled and
pt-BR text saying why, rather than silently dropping un-uploaded files.

## Consequences

**The global error net has a boundary, and this is where it falls.** ADR-0013
guarantees that no *write* fails silently, and the guarantee is exact: it covers
every tRPC mutation, and the S3 PUT is not one. `MutationCache.onError` never
sees it. The `createImageUpload` call is covered; the upload it authorises is
not.

The form owns that failure. A failed tile renders its own error state with a
per-file retry, and raises no toast: a toast is the wrong surface for something
with an item-scoped recovery, and routing it through the global handler would
put pt-BR copy in a second place — the thing ADR-0013 spent a decision avoiding.

**Objects are anonymous in the bucket.** Minted keys discard the uploaded
filename, so nothing identifies an object by eye; the row is the only thing that
says what it is. This is the trade the `id()` helper already made everywhere
else. `s3KeyToUrl`'s per-segment `encodeURIComponent` stays, now as defence
rather than necessity — its comment cited admin filenames reaching keys, which
this decision makes impossible, and has been corrected.

**Storage grows with abandoned forms.** Named here so it is found as a decision
rather than rediscovered as a bug.
