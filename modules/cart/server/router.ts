import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cart, cartItem } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { lineAvailability } from "@/modules/cart/availability";
import { formatUnits, unavailableReason } from "@/modules/cart/format";
import {
  addToCartSchema,
  removeCartItemSchema,
  setCartQuantitySchema,
} from "@/modules/cart/schemas";
import { toCart, type CartLineFacts } from "@/modules/cart/totals";
import type { Cart } from "@/modules/cart/types";
import { findLineFacts, lockCart } from "@/modules/cart/server/queries";
import type { ProductStatus } from "@/modules/products/constants";
import { variantLines } from "@/modules/products/server/lines";

/**
 * The Cart's refusals, beside the throws that raise them (ADR-0013). A write
 * is accepted only when the line it would leave behind is `available` — the
 * same rule that judges a line already held — so a refusal is named by the
 * availability that line would have had, in the sentence `/carrinho` renders
 * beside a line in that state (`unavailableReason`).
 *
 * Messages only, no `FieldError`: nothing renders these inline, and a field
 * payload would silence the global toast that does render them.
 */
const LINE_GONE_MESSAGE = "Este item não está mais no seu carrinho.";

/**
 * Throw unless `quantity` of this Variant could be bought now. `inCart` is
 * what an add is adding to, named in the refusal so the shopper can see why
 * a small add does not fit; an absolute set has nothing to add to.
 */
function refuseUnlessAvailable(
  facts: { productStatus: ProductStatus; stockQuantity: number },
  { quantity, inCart = 0 }: { quantity: number; inCart?: number },
): void {
  const { stockQuantity } = facts;
  const availability = lineAvailability({ ...facts, quantity });
  const reason = unavailableReason({ availability, stockQuantity });

  if (reason === null) return;

  throw new TRPCError({
    code: "CONFLICT",
    message:
      availability === "insufficient_stock" && inCart > 0
        ? `Só temos ${formatUnits(stockQuantity)} em estoque, e ${formatUnits(inCart)} já ${inCart === 1 ? "está" : "estão"} no seu carrinho.`
        : reason,
  });
}

/**
 * Flat, because a Cart has one audience (`docs/MODULES.md`): `trpc.cart.get`,
 * never `trpc.cart.shop.get`. Every procedure is protected — there is no guest
 * Cart — and derives the User from the session, never from input.
 */
export const cartRouter = createTRPCRouter({
  /**
   * The shopper's Cart with every line priced and judged against the current
   * Catalog. A User who has never added gets an empty Cart and no row is
   * created: `cart.get` never returns `null` (`docs/READ-PATH.md`).
   *
   * The Product side comes from `variantLines` (ADR-0030) **without** the
   * visibility clause, so a line whose Product was archived stays in view
   * with the reason it cannot be bought. Totals and availability are
   * `toCart`'s; this only fetches and orders.
   */
  get: protectedProcedure.query(async ({ ctx }): Promise<Cart> => {
    const stored = await db
      .select({ variantId: cartItem.variantId, quantity: cartItem.quantity })
      .from(cartItem)
      .innerJoin(cart, eq(cart.id, cartItem.cartId))
      .where(eq(cart.userId, ctx.auth.user.id))
      // Oldest first, and a quantity change does not touch `created_at`, so a
      // line never moves. The ids are UUIDv7 and break a tie the same way.
      .orderBy(asc(cartItem.createdAt), asc(cartItem.id));

    const lines = new Map(
      (
        await variantLines(
          db,
          stored.map((line) => line.variantId),
        )
      ).map((line) => [line.variantId, line]),
    );

    // A Variant deleted between the two reads has cascaded its line away; it
    // is dropped here rather than rendered as a ghost.
    const facts: CartLineFacts[] = stored.flatMap(({ variantId, quantity }) => {
      const line = lines.get(variantId);
      if (!line) return [];

      return [
        {
          variantId,
          variantName: line.variantName,
          productName: line.productName,
          productSlug: line.productSlug,
          productStatus: line.productStatus,
          coverS3Key: line.coverS3Key,
          coverAltText: line.coverAltText,
          unitPriceAmount: line.priceAmount,
          stockQuantity: line.stockQuantity,
          quantity,
        },
      ];
    });

    return toCart(facts);
  }),

  /**
   * Add units of a Variant: insert the line, or add to the one the Cart
   * holds. Creates the permanent Cart row on a User's first add.
   *
   * Refused when the Variant is gone, its Product is not on sale, or the
   * resulting quantity would exceed current stock. The Cart row lock makes
   * the read-then-write exact under concurrent adds (`server/queries.ts`).
   */
  add: protectedProcedure
    .input(addToCartSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        // Create-or-lock in one statement: `ON CONFLICT DO UPDATE` locks the
        // row it conflicts with, and a concurrent first add blocks on the
        // unique `user_id` until this one commits, then takes the update path.
        const [owned] = await tx
          .insert(cart)
          .values({ userId: ctx.auth.user.id })
          .onConflictDoUpdate({
            target: cart.userId,
            set: { updatedAt: new Date() },
          })
          .returning({ id: cart.id });

        // `RETURNING` yields the row on both paths.
        if (!owned) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const facts = await findLineFacts(tx, {
          cartId: owned.id,
          variantId: input.variantId,
        });

        if (!facts) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Esta variação não está mais disponível.",
          });
        }

        const inCart = facts.lineQuantity ?? 0;
        const quantity = inCart + input.quantity;

        refuseUnlessAvailable(facts, { quantity, inCart });

        // The absolute total just checked, not an increment: the lock means
        // nothing has changed the line since it was read.
        await tx
          .insert(cartItem)
          .values({ cartId: owned.id, variantId: input.variantId, quantity })
          .onConflictDoUpdate({
            target: [cartItem.cartId, cartItem.variantId],
            set: { quantity, updatedAt: new Date() },
          });

        return { variantId: input.variantId, quantity };
      }),
    ),

  /**
   * Set a line's absolute quantity. Refused when the line is gone, its
   * Product is not on sale, or the quantity exceeds current stock — which
   * also means a line whose stock fell below it can only be lowered to what
   * is left, or removed. Zero is refused by the schema; removal is `remove`.
   */
  setQuantity: protectedProcedure
    .input(setCartQuantitySchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const cartId = await lockCart(tx, ctx.auth.user.id);
        const facts = cartId
          ? await findLineFacts(tx, { cartId, variantId: input.variantId })
          : undefined;

        if (!cartId || facts?.lineQuantity == null) {
          throw new TRPCError({ code: "NOT_FOUND", message: LINE_GONE_MESSAGE });
        }

        refuseUnlessAvailable(facts, { quantity: input.quantity });

        // `created_at` is untouched, so the line keeps its place.
        await tx
          .update(cartItem)
          .set({ quantity: input.quantity })
          .where(
            and(
              eq(cartItem.cartId, cartId),
              eq(cartItem.variantId, input.variantId),
            ),
          );

        return { variantId: input.variantId, quantity: input.quantity };
      }),
    ),

  /**
   * Delete one of the User's lines; the Cart row survives. Removing a line
   * that is already gone succeeds — the shopper's intent already holds — so
   * a repeated click raises nothing. Emptying every line is checkout's
   * `server/empty.ts` and nothing else.
   */
  remove: protectedProcedure
    .input(removeCartItemSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const cartId = await lockCart(tx, ctx.auth.user.id);

        if (cartId) {
          await tx
            .delete(cartItem)
            .where(
              and(
                eq(cartItem.cartId, cartId),
                eq(cartItem.variantId, input.variantId),
              ),
            );
        }

        return { variantId: input.variantId };
      }),
    ),
});
