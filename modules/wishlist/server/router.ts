import "server-only";

import { TRPCError } from "@trpc/server";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  product,
  productVariant,
  wishlistItem,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { visibleProduct } from "@/modules/products/server/visibility";
import { variantLines } from "@/modules/products/server/lines";
import { WISHLIST_PER_PAGE } from "@/modules/wishlist/constants";
import {
  wishlistListParamsSchema,
  wishlistVariantSchema,
} from "@/modules/wishlist/schemas";

/**
 * The single-audience Wishlist API. Every operation derives its owner from the
 * authenticated session; a User id is never accepted as input.
 */
export const wishlistRouter = createTRPCRouter({
  /**
   * One page of saved Variants with their current Catalog facts. Product
   * visibility is deliberately not applied: archived entries remain removable
   * and a deleted Variant disappears through the Wishlist foreign-key cascade.
   */
  list: protectedProcedure
    .input(wishlistListParamsSchema)
    .query(async ({ ctx, input }) => {
      const where = eq(wishlistItem.userId, ctx.auth.user.id);

      const page = db
        .select({
          variantId: wishlistItem.variantId,
          savedAt: wishlistItem.createdAt,
        })
        .from(wishlistItem)
        .where(where)
        .orderBy(desc(wishlistItem.createdAt), desc(wishlistItem.variantId))
        .limit(WISHLIST_PER_PAGE)
        .offset((input.page - 1) * WISHLIST_PER_PAGE);

      const totalQuery = db
        .select({ value: count() })
        .from(wishlistItem)
        .where(where);

      const [saved, [totalRow]] = await Promise.all([page, totalQuery]);
      const lines = new Map(
        (
          await variantLines(
            db,
            saved.map((item) => item.variantId),
          )
        ).map((line) => [line.variantId, line]),
      );

      const items = saved.flatMap(({ variantId, savedAt }) => {
        const line = lines.get(variantId);
        if (!line) return [];

        return [
          {
            variantId,
            variantName: line.variantName,
            productName: line.productName,
            productSlug: line.productSlug,
            productStatus: line.productStatus,
            priceAmount: line.priceAmount,
            stockQuantity: line.stockQuantity,
            coverS3Key: line.coverS3Key,
            coverAltText: line.coverAltText,
            savedAt,
          },
        ];
      });

      return { items, total: totalRow?.value ?? 0 };
    }),

  /** Whether the ambient User currently holds this Variant. */
  isSaved: protectedProcedure
    .input(wishlistVariantSchema)
    .query(async ({ ctx, input }) => {
      const [saved] = await db
        .select({ variantId: wishlistItem.variantId })
        .from(wishlistItem)
        .where(
          and(
            eq(wishlistItem.userId, ctx.auth.user.id),
            eq(wishlistItem.variantId, input.variantId),
          ),
        )
        .limit(1);

      return saved !== undefined;
    }),

  /**
   * Save an existing Variant only while its Product is active. The shared row
   * locks keep that check and insert one moment with respect to Product status
   * changes and Variant deletion. Zero stock is valid for a Wishlist.
   */
  save: protectedProcedure
    .input(wishlistVariantSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const [available] = await tx
          .select({ variantId: productVariant.id })
          .from(productVariant)
          .innerJoin(product, eq(product.id, productVariant.productId))
          .where(
            and(
              eq(productVariant.id, input.variantId),
              visibleProduct,
            ),
          )
          .limit(1)
          .for("share");

        if (!available) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Esta variação não está disponível para salvar.",
          });
        }

        await tx
          .insert(wishlistItem)
          .values({
            userId: ctx.auth.user.id,
            variantId: input.variantId,
          })
          .onConflictDoNothing();

        return { variantId: input.variantId };
      }),
    ),

  /**
   * Remove one saved Variant for the ambient User. Repeating the command, or
   * removing an archived entry, succeeds because the requested state holds.
   */
  unsave: protectedProcedure
    .input(wishlistVariantSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(wishlistItem)
        .where(
          and(
            eq(wishlistItem.userId, ctx.auth.user.id),
            eq(wishlistItem.variantId, input.variantId),
          ),
        );

      return { variantId: input.variantId };
    }),
});
