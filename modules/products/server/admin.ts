import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import {
  brand,
  category,
  // The Orders that reference a Variant are what makes deleting one a refusal
  // rather than a write. The foreign key points this way (ADR-0009), and the
  // rule it carries is the products module's to enforce (ADR-0019).
  orderItem,
  product,
  productImage,
  productSpecification,
  productVariant,
} from "@/db/schema";
import { client } from "@/lib/s3";
import {
  imageUploadSchema,
  IMAGE_CONTENT_TYPES,
  IMAGE_EXTENSIONS,
  IMAGE_MAX_BYTES,
} from "@/lib/utils/image";
import { adminProcedure, createTRPCRouter, FieldError } from "@/trpc/init";
import { productListParamsSchema } from "@/modules/products/admin/schemas";
import {
  PRODUCTS_PER_PAGE,
  type ProductSortField,
  type ProductStatus,
} from "@/modules/products/constants";
import {
  isProductImageKey,
  PRODUCT_IMAGE_PREFIX,
} from "@/modules/products/images";
import { productSchema } from "@/modules/products/schemas";
import {
  findProductIdWithSlug,
  findSkusInUse,
} from "@/modules/products/server/queries";
import { isArchivable, isPublishable } from "@/modules/products/status";

/**
 * The sortable columns. A predicate that exists only as SQL is not a pure rule
 * and stays in the query (`docs/MODULES.md`); the *directions* are the rule,
 * and they live in the module's constants.
 */
const SORT_COLUMNS = {
  name: product.name,
  ratingAverage: product.ratingAverage,
  createdAt: product.createdAt,
} satisfies Record<ProductSortField, PgColumn>;

/** What both transitions take, and all they take. */
const transitionInput = z.object({ id: z.string() });

/**
 * The current status of one Product, or `undefined` if there is no such row.
 * Both transitions read this before they write, because the rule they ask is a
 * pure function of already-fetched data (`docs/MODULES.md`).
 *
 * Read-then-write, not one conditional `UPDATE`. Two Admins racing on the same
 * Product is not a failure worth writing code about: both acts are reversible
 * from the row that fired them, which is the same property that spends no
 * confirmation dialog on them (`docs/DATA-FLOW.md`).
 */
async function readStatus(id: string): Promise<ProductStatus | undefined> {
  const [row] = await db
    .select({ status: product.status })
    .from(product)
    .where(eq(product.id, id));

  return row?.status;
}

/**
 * No message: the global map already says "this item no longer exists, refresh
 * the page", and anything written here would win over it (ADR-0013) without
 * saying more.
 */
const notFound = () => new TRPCError({ code: "NOT_FOUND" });

/**
 * How long a minted upload URL is good for. Long enough for a large photograph
 * on a Brazilian connection, short enough that a URL copied out of the network
 * tab is worthless by the time it is used.
 */
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

/** The same list the browser checks against, as the write reads it back off S3. */
const ACCEPTED_IMAGE_TYPES = new Set<string>(IMAGE_CONTENT_TYPES);

/** How the size ceiling is said, in the two places that say it. */
const OVERSIZED_IMAGE_MESSAGE = `A imagem deve ter no máximo ${
  IMAGE_MAX_BYTES / 1024 / 1024
} MB.`;

/**
 * **The real guard behind every image** (ADR-0018). `presign` signs one method
 * and cannot cap a size, so the ceiling the browser was told about is a
 * ceiling only the browser obeys; this reads the object back and refuses one
 * that is missing, oversized, or of a type the bucket is not meant to hold.
 *
 * The missing case is the one no presign could ever have covered: a client
 * that sends a key it never uploaded. `create` and `update` both run this
 * **before** they open their transaction — a round trip per image has no
 * business holding a write open, and a refusal here has written nothing.
 *
 * The refusal names the tile that caused it, so the form renders it on that
 * image rather than as a toast the Admin has to match up with a photograph by
 * hand (ADR-0013).
 */
async function assertImagesUploaded(
  images: readonly { s3Key: string }[],
): Promise<void> {
  await Promise.all(
    images.map(async (image, index) => {
      const refuse = (message: string) =>
        new TRPCError({
          code: "CONFLICT",
          message,
          cause: new FieldError(`images.${index}.s3Key`),
        });

      // `productImageSchema` types `s3Key` as a non-empty string, because a
      // form value is a form value; the guarantee that a key names an object
      // *this* uploader minted is enforced here, before anything is looked up.
      // Without it a payload could name any object in the bucket and attach
      // it, which is the promise `createImageUpload` makes by minting keys
      // server-side (ADR-0018) — kept on the way back in too.
      if (!isProductImageKey(image.s3Key)) {
        throw refuse(
          "Esta imagem não chegou ao servidor. Remova-a e envie o arquivo novamente.",
        );
      }

      let stat;

      try {
        stat = await client.stat(image.s3Key);
      } catch {
        throw refuse(
          "Esta imagem não chegou ao servidor. Remova-a e envie o arquivo novamente.",
        );
      }

      if (stat.size > IMAGE_MAX_BYTES) throw refuse(OVERSIZED_IMAGE_MESSAGE);

      if (!ACCEPTED_IMAGE_TYPES.has(stat.type)) {
        throw refuse("Envie uma imagem JPEG, PNG, WebP ou AVIF.");
      }
    }),
  );
}

/**
 * An Image's Variant, turned from the index the form sent into the id the row
 * needs (ADR-0019). Both writes resolve it the same way, against the ids their
 * own statements have just settled.
 *
 * Null means the shot belongs to the Product as a whole — and so does an index
 * no Variant answers to, which is what a tile becomes when the Variant it
 * named was removed from the array in the same session. Reattaching the
 * photograph to the Product loses nothing; refusing the save would strand the
 * Admin on a form whose broken tile is invisible.
 */
function resolveVariantId(
  index: number | null,
  variantIds: readonly (string | undefined)[],
): string | null {
  if (index === null) return null;

  return variantIds[index] ?? null;
}

/**
 * The S3 objects behind keys that are leaving, deleted as part of the write
 * that drops them (ADR-0018) — but **after** it commits, not inside it.
 *
 * Inside the transaction was the first shape of this, and it is the wrong way
 * round. `client.delete` is not transactional: one delete of several failing
 * rolls the rows back while the objects already deleted stay deleted, and the
 * Product is left holding rows that point at nothing — a broken photograph on
 * the shop, which is the failure ADR-0018 spends orphans to avoid.
 *
 * After the commit, the same failure leaves an unreferenced object instead,
 * which is the thing this ADR already tolerates. So a failure here is
 * swallowed for the same reason `discardImageUpload` swallows one: the save
 * the Admin asked for succeeded, and a toast about a bucket is not something
 * they can act on.
 */
async function deleteImageObjects(keys: readonly string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await client.delete(key);
      } catch {
        // Exactly the orphan an abandoned form leaves, and priced the same.
      }
    }),
  );
}

export const adminRouter = createTRPCRouter({
  /**
   * Every Product in every status, one page at a time. `perPage` is not an
   * input (ADR-0014): it is `PRODUCTS_PER_PAGE`.
   *
   * A list always succeeds. A `categoryId` that no longer exists matches
   * nothing and yields an empty page, never a 404 — absence resolves to
   * "absent" on a read (`docs/DATA-FLOW.md`).
   */
  list: adminProcedure
    .input(productListParamsSchema)
    .query(async ({ input }) => {
      const where = and(
        // The GIN index over the Portuguese tsvector, `product_search_idx`.
        // `plainto_tsquery` takes whatever an Admin typed and ands the lexemes,
        // so "fone bluetooth" needs both and no input can be a syntax error.
        input.search
          ? sql`${product.searchVector} @@ plainto_tsquery('portuguese', ${input.search})`
          : undefined,
        input.status ? eq(product.status, input.status) : undefined,
        input.categoryId ? eq(product.categoryId, input.categoryId) : undefined,
        input.brandId ? eq(product.brandId, input.brandId) : undefined,
      );

      const direction = input.sortOrder === "asc" ? asc : desc;
      const orderBy: SQL[] = [
        direction(SORT_COLUMNS[input.sortBy]),
        // uuidv7 ids sort by creation, so this breaks ties in a stable order
        // rather than letting a row cross a page boundary between requests.
        asc(product.id),
      ];

      const items = db
        .select({
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
          ratingAverage: product.ratingAverage,
          ratingCount: product.ratingCount,
          createdAt: product.createdAt,
          brandName: brand.name,
          categoryName: category.name,
          // Both FKs are notNull with `onDelete: "restrict"`, so an inner join
          // can never drop a Product — which is also why `total` below can
          // count the same `where` without repeating them.
          variantCount: count(productVariant.id),
          totalStock: sql<number>`coalesce(sum(${productVariant.stockQuantity}), 0)::int`,
        })
        .from(product)
        .innerJoin(brand, eq(brand.id, product.brandId))
        .innerJoin(category, eq(category.id, product.categoryId))
        .leftJoin(productVariant, eq(productVariant.productId, product.id))
        .where(where)
        .groupBy(product.id, brand.id, category.id)
        .orderBy(...orderBy)
        .limit(PRODUCTS_PER_PAGE)
        .offset((input.page - 1) * PRODUCTS_PER_PAGE);

      // The count before pagination: `PaginationNav` needs a page count, and
      // the aggregate join above makes it a second query rather than a window.
      const total = db.select({ value: count() }).from(product).where(where);

      const [rows, [totalRow]] = await Promise.all([items, total]);

      return { items: rows, total: totalRow?.value ?? 0 };
    }),

  /**
   * The whole aggregate behind `/admin/products/[id]`: the row plus its
   * Variants, Images and Specifications, each ordered by `position` — the
   * order the Admin arranged them in (ADR-0018).
   *
   * **One query, through the relational builder**, because one React Hook
   * Form needs one `defaultValues` object. Splitting the children into
   * procedures of their own would make the form wait on two boundaries or
   * stitch them itself (`docs/PRODUCTS-ADMIN.md`).
   *
   * **Returns `null`, never `NOT_FOUND`.** A read resolves absence to
   * "absent", and the page turns the `null` into `notFound()` — which keeps
   * the control flow in `page.tsx`, where ADR-0006 already put the auth check
   * (`docs/DATA-FLOW.md`).
   */
  byId: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const row = await db.query.product.findFirst({
        // The generated `tsvector` is the name and the description over again,
        // and nothing on this page reads it. Every other column stays: a
        // `columns` map holding only `false` is an exclusion, not a selection.
        columns: { searchVector: false },
        where: { id: input.id },
        with: {
          variants: { orderBy: { position: "asc" } },
          images: { orderBy: { position: "asc" } },
          specifications: { orderBy: { position: "asc" } },
        },
      });

      return row ?? null;
    }),

  /**
   * Writes a whole Product — the row, its Variants and its Specifications — in
   * **one transaction**, so an Admin cannot end up with half a listing and
   * lose the rest. It takes the root `productSchema`, the same object the form
   * validated against, and returns the new id for the call site to navigate
   * to.
   *
   * **`status` is written unconditionally and is not in the payload.** A new
   * Product is a `draft`, so an unfinished listing cannot reach the shop by
   * accident; putting one on sale is `publish`, which is a different act
   * (`docs/MODULES.md`, "Naming").
   *
   * **The Images are already in the bucket** (ADR-0018): the browser uploaded
   * each one when the Admin picked it, and what arrives here is the key. So
   * this write `stat`s every key before it opens the transaction, and resolves
   * each tile's `variantId` **index** against the ids its own Variant inserts
   * produce (ADR-0019).
   */
  create: adminProcedure.input(productSchema).mutation(async ({ input }) => {
    await assertImagesUploaded(input.images);

    return db.transaction(async (tx) => {
      // Both uniques are checked before the write rather than caught after it,
      // for the reason `queries.ts` gives. No `exceptId` here: a Product that
      // does not exist yet has no slug of its own to collide with.
      const taken = await findProductIdWithSlug(tx, { slug: input.slug });

      if (taken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um produto com esta URL.",
          // Lifted to `data.field` by the errorFormatter, which is what puts
          // this sentence under the slug input and makes the global toast
          // stand down (ADR-0013).
          cause: new FieldError("slug"),
        });
      }

      const takenSkus = await findSkusInUse(tx, {
        skus: input.variants.map((variant) => variant.sku),
      });
      const takenIndex = input.variants.findIndex((variant) =>
        takenSkus.has(variant.sku),
      );

      if (takenIndex !== -1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `O SKU ${input.variants[takenIndex].sku} já está em uso.`,
          // The path React Hook Form registered the input under, so the
          // message lands on the row that caused it rather than on the
          // section heading above it.
          cause: new FieldError(`variants.${takenIndex}.sku`),
        });
      }

      const [created] = await tx
        .insert(product)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
          brandId: input.brandId,
          categoryId: input.categoryId,
          status: "draft",
        })
        .returning({ id: product.id });

      // The schema guarantees at least one Variant (`CONTEXT.md`), so this
      // insert never runs empty. `position` is derived from the array index
      // and never sent: the order the Admin arranged is the order that
      // persists (ADR-0018).
      //
      // `returning` answers in the order of the `values` list, which is what
      // turns an Image's Variant *index* into an id below.
      const insertedVariants = await tx.insert(productVariant).values(
        input.variants.map((variant, index) => ({
          productId: created.id,
          name: variant.name,
          sku: variant.sku,
          priceAmount: variant.priceAmount,
          compareAtPriceAmount: variant.compareAtPriceAmount,
          stockQuantity: variant.stockQuantity,
          weightGrams: variant.weightGrams,
          lengthMm: variant.lengthMm,
          widthMm: variant.widthMm,
          heightMm: variant.heightMm,
          position: index,
        })),
      ).returning({ id: productVariant.id });

      // A technical sheet is optional, and Drizzle refuses an empty `values`.
      if (input.specifications.length > 0) {
        await tx.insert(productSpecification).values(
          input.specifications.map((specification, index) => ({
            productId: created.id,
            label: specification.label,
            value: specification.value,
            position: index,
          })),
        );
      }

      // Photographs are optional too — a draft is written before the shoot as
      // often as after it. `position` is the array index here as well: the
      // shop leads with the shot the Admin put first (ADR-0018).
      if (input.images.length > 0) {
        const variantIds = insertedVariants.map((variant) => variant.id);

        await tx.insert(productImage).values(
          input.images.map((image, position) => ({
            productId: created.id,
            variantId: resolveVariantId(image.variantId, variantIds),
            s3Key: image.s3Key,
            altText: image.altText,
            position,
          })),
        );
      }

      return { id: created.id };
    });
  }),

  /**
   * Edits a whole Product in **one transaction**, so a failure halfway through
   * never leaves a Product with the wrong Variants.
   *
   * **It reconciles; it never replaces** (ADR-0019). Replace-all is the
   * obvious implementation and the schema forbids it twice over:
   * `order_item.variant_id` is `restrict`, so deleting the children would make
   * every Product that has ever sold uneditable, and `cart_item.variant_id` is
   * `cascade`, so deleting a Variant in order to re-insert it would empty that
   * line out of every shopper's Cart — a rename would cost the sale.
   *
   * So a child with an `id` updates, a child without one inserts, and a child
   * whose id did not come back is deleted. **Every reconcile is scoped by
   * `productId`**, which is what an `id?` a client can lie about needs: an id
   * belonging to another Product matches no row here, so it is treated as an
   * insert rather than as a write across aggregates.
   *
   * **`status` is not in the payload and is not touched.** A Product moves
   * through `publish` and `archive` below — the form edits what a Product
   * *is*, a transition is what it *does*. **`slug` is an ordinary editable
   * field with no linkage to `name`**: it is a public URL (ADR-0005), and
   * rewriting it because someone fixed a typo would break every link that was
   * ever shared.
   *
   * **Images reconcile too**, and their keys are `stat`ed before the
   * transaction opens exactly as in `create`. Each tile's `variantId`
   * **index** is resolved against the ids reconcile has just settled, and the
   * S3 object behind a key that left the array is deleted as part of this
   * write (ADR-0018).
   */
  update: adminProcedure
    .input(productSchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      await assertImagesUploaded(input.images);

      const written = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: product.id })
          .from(product)
          .where(eq(product.id, input.id));

        if (!existing) throw notFound();

        // The same two lookups `create` runs, excluding this Product from
        // both: the row being edited holds its own slug and its own SKUs, so a
        // field nobody changed is not a collision with itself.
        const taken = await findProductIdWithSlug(tx, {
          slug: input.slug,
          exceptId: input.id,
        });

        if (taken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe um produto com esta URL.",
            cause: new FieldError("slug"),
          });
        }

        const takenSkus = await findSkusInUse(tx, {
          skus: input.variants.map((variant) => variant.sku),
          exceptProductId: input.id,
        });
        const takenIndex = input.variants.findIndex((variant) =>
          takenSkus.has(variant.sku),
        );

        if (takenIndex !== -1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `O SKU ${input.variants[takenIndex].sku} já está em uso.`,
            cause: new FieldError(`variants.${takenIndex}.sku`),
          });
        }

        // The reconcile's one read, and the scope every statement below
        // inherits from it: these are the ids this Product actually holds.
        const current = await tx
          .select({ id: productVariant.id })
          .from(productVariant)
          .where(eq(productVariant.productId, input.id));

        const currentIds = new Set(current.map((row) => row.id));
        // An id the client sent that this Product does not hold is not kept —
        // it falls through to an insert below rather than naming a row of
        // somebody else's aggregate.
        const keptIds = new Set(
          input.variants
            .map((variant) => variant.id)
            .filter((id) => id !== undefined && currentIds.has(id)),
        );
        const removedIds = current
          .map((row) => row.id)
          .filter((id) => !keptIds.has(id));

        // **Before the write**, so a refused deletion costs nothing: the
        // Orders that reference a Variant are history, and history is the
        // reason `order_item.variant_id` is `restrict` in the first place.
        if (removedIds.length > 0) {
          const [sold] = await tx
            .select({ id: orderItem.id })
            .from(orderItem)
            .where(inArray(orderItem.variantId, removedIds))
            .limit(1);

          if (sold) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Esta variação já foi vendida e não pode ser removida.",
              // The array rather than one of its rows: the row the Admin
              // removed is no longer in the form to point at (ADR-0019).
              cause: new FieldError("variants"),
            });
          }
        }

        // `status` is absent from this `set` on purpose — see above. So is
        // `updatedAt`, which `timestamps()` maintains with `$onUpdate`.
        await tx
          .update(product)
          .set({
            name: input.name,
            slug: input.slug,
            description: input.description,
            brandId: input.brandId,
            categoryId: input.categoryId,
          })
          .where(eq(product.id, input.id));

        // Deletions first, so a SKU this save frees is available to a Variant
        // the same save adds. `product_variant.sku` is unique across the whole
        // catalog and the index is checked per statement, so the one edit this
        // ordering cannot rescue is two Variants *swapping* SKUs: the first
        // update collides with the row the second has not written yet, and the
        // transaction rolls back under the generic pt-BR toast.
        if (removedIds.length > 0) {
          await tx
            .delete(productVariant)
            .where(
              and(
                eq(productVariant.productId, input.id),
                inArray(productVariant.id, removedIds),
              ),
            );
        }

        // `position` is the array index and is never sent, exactly as on
        // create: the order the Admin arranged is the order that persists
        // (ADR-0018).
        // The id of the Variant at each index of the form's array, which is
        // the address an Image's `variantId` holds (ADR-0019). An updated row
        // already has one; an inserted row's comes back from its insert.
        const variantIds: (string | undefined)[] = [];
        const inserts: (typeof productVariant.$inferInsert)[] = [];
        const insertPositions: number[] = [];

        for (const [position, variant] of input.variants.entries()) {
          const values = {
            name: variant.name,
            sku: variant.sku,
            priceAmount: variant.priceAmount,
            compareAtPriceAmount: variant.compareAtPriceAmount,
            stockQuantity: variant.stockQuantity,
            weightGrams: variant.weightGrams,
            lengthMm: variant.lengthMm,
            widthMm: variant.widthMm,
            heightMm: variant.heightMm,
            position,
          };

          if (variant.id !== undefined && currentIds.has(variant.id)) {
            await tx
              .update(productVariant)
              .set(values)
              .where(
                and(
                  eq(productVariant.id, variant.id),
                  eq(productVariant.productId, input.id),
                ),
              );
            variantIds[position] = variant.id;
            continue;
          }

          inserts.push({ productId: input.id, ...values });
          insertPositions.push(position);
        }

        if (inserts.length > 0) {
          // In the order of the `values` list, which is the order the
          // positions were pushed in.
          const inserted = await tx
            .insert(productVariant)
            .values(inserts)
            .returning({ id: productVariant.id });

          inserted.forEach((row, index) => {
            variantIds[insertPositions[index]] = row.id;
          });
        }

        // **Specifications replace-all**, and that is not an inconsistency
        // with the reconcile above (ADR-0019). Nothing references a
        // Specification, so neither foreign-key hazard applies — and their
        // `(product_id, label)` unique index is what reconcile would *fail*
        // on: swapping two labels writes the first before deleting the second.
        await tx
          .delete(productSpecification)
          .where(eq(productSpecification.productId, input.id));

        if (input.specifications.length > 0) {
          await tx.insert(productSpecification).values(
            input.specifications.map((specification, position) => ({
              productId: input.id,
              label: specification.label,
              value: specification.value,
              position,
            })),
          );
        }

        // **The Images reconcile like the Variants**, and not for the
        // Variants' reason: nothing references a `product_image` row, so
        // replace-all would be legal here. It is still wrong. An id is what
        // ties a row to the tile the Admin is editing, and churning ids every
        // time somebody fixes a typo in alt text would rewrite the whole
        // gallery to save a diff.
        const currentImages = await tx
          .select({ id: productImage.id, s3Key: productImage.s3Key })
          .from(productImage)
          .where(eq(productImage.productId, input.id));

        const currentImageIds = new Set(currentImages.map((row) => row.id));
        const keptImageIds = new Set(
          input.images
            .map((image) => image.id)
            .filter((id) => id !== undefined && currentImageIds.has(id)),
        );
        const droppedImages = currentImages.filter(
          (row) => !keptImageIds.has(row.id),
        );

        if (droppedImages.length > 0) {
          await tx.delete(productImage).where(
            and(
              eq(productImage.productId, input.id),
              inArray(
                productImage.id,
                droppedImages.map((row) => row.id),
              ),
            ),
          );
        }

        const imageInserts: (typeof productImage.$inferInsert)[] = [];

        for (const [position, image] of input.images.entries()) {
          const values = {
            // Resolved against the ids settled just above, which is why this
            // runs after the Variants and not beside them.
            variantId: resolveVariantId(image.variantId, variantIds),
            s3Key: image.s3Key,
            altText: image.altText,
            position,
          };

          if (image.id !== undefined && currentImageIds.has(image.id)) {
            await tx
              .update(productImage)
              .set(values)
              .where(
                and(
                  eq(productImage.id, image.id),
                  eq(productImage.productId, input.id),
                ),
              );
            continue;
          }

          imageInserts.push({ productId: input.id, ...values });
        }

        if (imageInserts.length > 0) {
          await tx.insert(productImage).values(imageInserts);
        }

        // **The objects behind the keys that left** — handed out of the
        // transaction rather than deleted inside it, because `client.delete`
        // cannot roll back and a half-deleted set plus a rollback is a
        // Product pointing at objects that are gone (`deleteImageObjects`).
        //
        // A key the payload still holds is never deleted, however its row was
        // reconciled: the object is what the Admin can see, and it outlives
        // the row that happened to reference it.
        const submittedKeys = new Set(input.images.map((image) => image.s3Key));

        return {
          id: input.id,
          droppedKeys: droppedImages
            .map((row) => row.s3Key)
            .filter((key) => !submittedKeys.has(key)),
        };
      });

      // Committed, so the rows that referenced these keys are gone whatever
      // happens next. The removal an Admin confirmed by saving (ADR-0018).
      await deleteImageObjects(written.droppedKeys);

      return { id: written.id };
    }),

  /**
   * Puts a Product on sale: `draft | archived → active`.
   *
   * A domain verb rather than a `status` field on the form — a form edits what
   * a Product *is*, a transition is what it *does*, and this one fires from a
   * list row where no form exists (`docs/MODULES.md`, "Naming").
   *
   * It orchestrates and decides nothing: `isPublishable` is the rule, and it
   * lives at the module root where `bun test` reaches it without a database.
   * The refusal is a `CONFLICT` carrying its own pt-BR sentence — ADR-0013's
   * module tier, written beside the condition that raises it, winning over the
   * global code map. It names no field, so the global net toasts it rather
   * than standing down for a form that is not there.
   */
  publish: adminProcedure
    .input(transitionInput)
    .mutation(async ({ input }) => {
      const status = await readStatus(input.id);
      if (!status) throw notFound();

      if (!isPublishable(status)) {
        throw new TRPCError({
          code: "CONFLICT",
          // `active` is the only status `isPublishable` refuses, so the
          // sentence can name it instead of describing the rule.
          message: "Este produto já está à venda.",
        });
      }

      await db
        .update(product)
        .set({ status: "active" })
        .where(eq(product.id, input.id));

      return { id: input.id };
    }),

  /**
   * Withdraws a Product from sale: `draft | active → archived`. A Product is
   * never deleted (`CONTEXT.md`) — Orders still refer to it — and archiving is
   * undone by `publish`, which is why neither act asks for confirmation.
   *
   * Written out rather than shared with `publish` above. The two differ by a
   * rule and a status, and a factory taking both as parameters would move the
   * refusal copy away from the throw that raises it — the proximity ADR-0013
   * is for — and would read, in the module the other eight copy, as though
   * every status transition needs one built first.
   */
  archive: adminProcedure
    .input(transitionInput)
    .mutation(async ({ input }) => {
      const status = await readStatus(input.id);
      if (!status) throw notFound();

      if (!isArchivable(status)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este produto já está arquivado.",
        });
      }

      await db
        .update(product)
        .set({ status: "archived" })
        .where(eq(product.id, input.id));

      return { id: input.id };
    }),

  /**
   * Authorises one image upload: takes what the browser knows about the file
   * and returns the key it will be stored under together with a presigned PUT
   * (ADR-0018). The file never transits this server.
   *
   * **The key is minted here, and that is the whole point.** A client that
   * cannot name a key cannot overwrite an existing object, cannot escape the
   * `products/` prefix, and cannot put a filename of its own choosing in front
   * of anyone. It is `products/<uuidv7>.<ext>`, reusing the
   * `Bun.randomUUIDv7()` that `db/schema/columns.ts` already mints ids with —
   * so the bucket sorts by upload time, and the row is the only thing that
   * says what an object is.
   *
   * **Neither the size nor the type is enforced by the signature.** `presign`
   * signs one method and has no `content-length-range`, and a query-signed PUT
   * does not carry `Content-Type` among its signed headers — S3 takes a
   * mismatched one. So the input's `contentType` decides what the object will
   * be *called*, the input's `size` refuses the Admin before the bytes move,
   * and `create` and `update` `stat` the object as the guard that holds.
   *
   * Named for the act rather than the mechanism (ADR-0010), so a later move to
   * a POST policy does not rename it.
   */
  createImageUpload: adminProcedure
    .input(imageUploadSchema)
    .mutation(({ input }) => {
      const key = `${PRODUCT_IMAGE_PREFIX}/${Bun.randomUUIDv7()}.${
        IMAGE_EXTENSIONS[input.contentType]
      }`;

      const url = client.presign(key, {
        method: "PUT",
        type: input.contentType,
        expiresIn: UPLOAD_URL_TTL_SECONDS,
      });

      return { key, url };
    }),

  /**
   * Throws away an upload nobody kept: the object behind a tile the Admin
   * removed before the Product was ever saved with it. **The one orphan we
   * can see, so we take it** (ADR-0018) — every other abandoned object stays,
   * because there is no scheduled runner to sweep them and a sweep nobody runs
   * reads as though orphans were handled.
   *
   * Two things make an admin-only delete-by-key safe to expose. The key must
   * look like one this app minted, so no path can be walked out of the prefix;
   * and **an object any `product_image` row references is refused**, which is
   * what confines this to uploads that were never persisted. A persisted
   * Image's object dies with the `update` that drops its key.
   *
   * **It never throws for a failed delete.** The Admin asked to remove a tile,
   * not to clean a bucket, and a toast about S3 for an act that visibly
   * succeeded would be noise; what is left behind is exactly the orphan
   * ADR-0018 already tolerates.
   */
  discardImageUpload: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      if (!isProductImageKey(input.key)) return { discarded: false };

      const [persisted] = await db
        .select({ id: productImage.id })
        .from(productImage)
        .where(eq(productImage.s3Key, input.key))
        .limit(1);

      if (persisted) return { discarded: false };

      try {
        await client.delete(input.key);
      } catch {
        return { discarded: false };
      }

      return { discarded: true };
    }),
});
