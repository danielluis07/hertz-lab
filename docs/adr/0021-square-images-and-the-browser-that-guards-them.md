# 21. Photographs are square, and only the browser knows it

Date: 2026-09-04

## Status

Accepted

## Context

ADR-0018 settled how a file reaches the bucket. It did not settle what may be
in the file. Today the only constraints on a product photograph are its MIME
type and 5 MB (`modules/products/schemas.ts`), and nothing anywhere describes
its shape.

That gap is invisible because the surface that would reveal it does not exist:
`app/(shop)/produto/[slug]/page.tsx` is seven lines returning an `<h1>`. The
shop has never rendered an Image, so no upload has ever been wrong.

Two things in the repo have already assumed an answer without stating one. The
admin tiles render `aspect-square … object-cover`, which is a ratio decision
living in a CSS class. And `next.config.ts` allows `images.unsplash.com` and
nothing else, so `next/image` cannot touch a bucket object at all — the comment
in `image-fields.tsx` explains that absence for the admin's sake, which was true
while the admin was the only reader.

One more fact narrows the options: **`stat` returns object metadata, not image
headers.** ADR-0018 could say "the write is the real guard" about type and size
because both come back from the object. Neither the width nor the height does.
Reading them server-side means a direct `sharp` dependency (`sharp` is on disk
as a transitive dependency of `next`, and is nobody's to import) or hand-parsing
container formats, of which AVIF is the one that costs a day.

## Decision

### One ratio, and it is square

Every catalogue photograph is **1:1**. The card in the grid, the gallery on the
product page, the thumbnail strip, the cart line and the Category tile all read
the same object.

Audio and electronics on a white ground is the genre where square is the
convention, so nothing expressive is lost, and one ratio means one source: the
"Capa" badge on the first tile is honest, because the Admin sees in the form
what the grid will show. The alternative — render whatever is given and
`object-cover` it into a fixed box — produces headphones with the cable
amputated in the grid and no way to tell whether the fault is the photograph or
the CSS.

### The master is a source, not an asset

`NEXT_PUBLIC_ASSET_URL`'s hostname joins `remotePatterns`, and the shop renders
through `next/image`. Every rendition a shopper downloads is derived and
re-encoded per breakpoint; the uploaded file itself is never served.

This is what makes a wrong-sized upload *degrade* rather than break, and it is
what removes the ceiling from the list of things that must bite: nobody
downloads the master, so its size is a storage question.

The admin tiles stay on a plain `<img>` for the reason they always had — a
`blob:` preview cannot go through the optimizer, and a bucket object at
thumbnail size on a page only an Admin opens does not need to.

### The numbers

| | |
| --- | --- |
| Ratio | exactly 1:1 |
| Minimum | 1200 × 1200 |
| Ideal | 1600 × 1600 |
| Maximum | 4000 × 4000 |
| Bytes | 5 MB, unchanged |
| Types | `jpeg`, `png`, `webp`, `avif`, unchanged |

The floor is the product page: a gallery at 2× DPR in a half-width desktop
column wants about 1200, and below that zoom is mush. The ceiling is generous on
purpose — 2400 was considered and rejected because refusing a photograph for
being *too good* is a bad sentence to have to write in pt-BR, and the byte cap
already does most of the bounding. What the ceiling actually buys is a bounded
decode in the optimizer.

**The Category tile takes the same numbers.** It renders at perhaps 300 px, so
1200 is many times what it needs. Two floors would mean two panels, two
sentences and an Admin who has to remember which surface they are on; the cost
of over-provisioning eight category pictures is a few hundred kilobytes.

### The Admin makes it square, and the form refuses the rest

On pick, the browser reads the file's real dimensions and rejects anything that
is not square, is under the floor, or is over the ceiling. **The bytes that
reach the bucket are the Admin's original file, untouched.**

Cropping in the browser was the alternative, and it is the better product: a
canvas frame turns an Admin holding a 4:3 lifestyle shot from blocked into one
drag, and it would make squareness a fact about the bytes rather than a claim
about them. It was rejected on scope — a cropper is a dependency or 150 lines of
drag-and-wheel, plus explicit EXIF-orientation handling or portrait phone photos
land sideways, plus a re-encode whose loss has to be reasoned about. **It is the
obvious reopening: given a cropper, refusal becomes correction and the next
section's limit shrinks.**

Three refusals, each naming what it got — not square, too small, too large.
`Envie uma imagem válida` is the failure mode this exists to avoid.

The spec is stated **before** the mistake, in a panel above the picker rather
than only in the refusal:

> Quadrada (1:1) · mínimo 1200×1200 · ideal 1600×1600 · máximo 4000×4000 ·
> até 5 MB · JPG, PNG, WebP ou AVIF

### Geometry is checked in the browser and nowhere else

This is a limit on ADR-0018, and it is written here because that ADR's
sentence — "the write is the real guard" — reads as though it covered
everything. It covers what `stat` returns. It does not cover pixels, and after
this decision nothing does.

The distinction that makes that acceptable: **type and size are guarded because
a wrong one is an attack or a cost** — an HTML file in a public bucket, a 200 MB
object — while a wrong ratio is neither. It is a mistake made by someone who is
authenticated, who could PUT arbitrary bytes anyway, and whose mistake renders
center-cropped rather than corrupt.

The two ways to close it were both refused for their price rather than their
principle: a direct `sharp` dependency puts a native package in `package.json`
and a per-image round trip inside a write, which is the cost ADR-0018 already
declined for a different reason; hand-parsing headers is a ranged GET and a
hundred lines, of which the AVIF box structure is most of it.

### The Category tile is the second uploader, and it promotes the component but not the procedure

A Category carries **one nullable `image_s3_key`** — a square picture for the
homepage row, not a photograph of anything for sale. It is not inherited: a
child Category without one is skipped from the row, because a row of grey boxes
is worse than a shorter row and a Category is fully usable without a picture. A
wide per-Category banner was rejected as a second ratio, a second panel and a
second uploader for a store with eight categories, and as the first asset to go
stale.

That makes two uploaders, which is ADR-0007's trigger. **ADR-0009 decides half
of how they share**: `product.category_id` means products may import categories
and categories may never import products, so nothing shared can live in
`modules/products/`.

What promotes to the global layer is the **field**: the tile, the determinate
bar, `putWithProgress`, the dimension read, and the constants — types, ceilings,
the floor. Those are shapes, which is what ADR-0007 allows the global layer to
know.

It promotes into **two** files, not one, because
`docs/CONVENTIONS.md` draws a runtime boundary through the middle of it.
`lib/utils/image.ts` takes everything isomorphic and pure — the types, the
extensions, the byte cap, the dimension bounds, the checks over a `{ type,
size }` and a `{ width, height }`, and the key pattern each module binds its own
prefix into. That is one value's shape, validation and vocabulary in one file,
which is what `lib/utils/document.ts` already is. `putWithProgress` cannot join
it: `lib/utils/*` are isomorphic and mark nothing, and `XMLHttpRequest` is a
browser API, so the transport goes to `lib/upload.ts` on its own.

What does **not** promote is the pair of procedures. `createImageUpload` mints a
prefix (`products/…`, `categories/…`), and `discardImageUpload`'s real guard is a
query against one specific table — "a key any `product_image` row references is
refused" cannot be written once for two tables. Each module keeps its own pair
over the one global `client` in `lib/s3.ts`, exactly as ADR-0018 already has it,
and the global field takes the mutation pair as a prop.

What does not promote either is anything that is a **rule about a Product**: alt
text, the Variant index, the "Capa" badge. Those stay in the products tile,
which composes the global field.

### No photograph, no publishing

`productSchema` requires at least one Variant and no Images, so an Admin can
publish a Product nobody can see. **An active Product has at least one Image**
joins `modules/products/status.ts`, which is where publish rules already live
and where ADR-0017 makes it a tested one.

It is a *publish* rule and not a schema one: an Admin writing a description
before the photo shoot arrives is a normal Tuesday, and a draft is exactly the
state for it. Archived Products are grandfathered — ADR-0003's logic, that
history stays true, applies to the catalogue too.

`public/images/image-placeholder.jpg` (612 × 612) is still rendered wherever
there is no Image, because archived Products appear in Order history and a
broken `<img>` there is worse than a grey square. It is imported statically, so
`next/image` gets its intrinsic dimensions, and **one component owns the
fallback** — a ternary repeated at five call sites is five chances to forget
one, and that component is the natural home for the `sizes` prop that stops a
1600 px file being shipped into a 300 px card.

It is below the floor this ADR sets for an upload, which is deliberate and not
an oversight: it is never zoomed, because the only surface that would zoom it is
a product page for a Product that this decision no longer lets anyone publish.

### A Category picture has no alt text

`alt=""`. The tile is a link whose accessible name is already the Category name;
describing the picture beside it makes a screen reader say the same word twice.

This deliberately breaks symmetry with `product_image.alt_text`, which is
`notNull` and refused empty. The asymmetry is the point: a Product photograph is
the only description a blind shopper gets of the thing on offer, which is why
ADR-0018 refused to auto-fill it, and a Category tile is decoration next to its
own label.

## Consequences

**A non-square object can exist and nothing will say so.** Named here rather
than discovered later. It renders center-cropped in every surface, which is why
the failure is tolerable, and the diagnosis for "this photo looks wrong in the
grid" is now a documented one.

**Two Admin surfaces now share a component and not a rule.** The seam is
`lib/utils/image.ts` for what is true of any image, and the module's own schema
for what is true of a Product's. It is the line ADR-0007 draws, applied to the
first thing that actually crossed it.

**The only tested thing here is a pair of pure functions**, and that is by
construction rather than by omission. ADR-0017 tests rules and nothing else, so
the browser's dimension *read* is untested and the judgement of what it returns
is not — which is why the check takes a `{ width, height }` rather than a
`File`, the same split `checkImageUpload` already makes for `{ type, size }`.

**`next.config.ts` gains the asset host**, and with it the comment in
`image-fields.tsx` about `remotePatterns` becomes half true — its reasoning
still holds for the admin tiles and no longer explains the config.

**Existing photographs are not migrated.** Nothing in the catalogue was uploaded
under this rule; there is no catalogue. If that changes before the shop ships,
the fix is a re-upload, not a backfill, because the whole point of the decision
is that only the browser can tell.
