import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  product,
  review,
  user,
} from "@/db/schema";
import { reviewSchema } from "@/modules/reviews/schemas";
import {
  findQualifyingOrder,
  findReviewStatus,
} from "@/modules/reviews/server/queries";
import { reviewAuthorLabel } from "@/modules/reviews/shop/author-label";
import { REVIEWS_PER_PAGE } from "@/modules/reviews/shop/constants";
import { toReviewPage } from "@/modules/reviews/shop/pagination";
import { reviewCursorSchema } from "@/modules/reviews/shop/schemas";
import { reviewWritingState } from "@/modules/reviews/shop/writing-state";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";

const productInput = z.object({ productId: z.string().min(1) });
const listInput = productInput.extend({ cursor: reviewCursorSchema.optional() });

const duplicateReview = () =>
  new TRPCError({
    code: "CONFLICT",
    message: "Você já avaliou este produto.",
  });

export const shopRouter = createTRPCRouter({
  /** Public, approved Reviews in stable newest-first cursor order. */
  list: baseProcedure.input(listInput).query(async ({ input }) => {
    const cursor = input.cursor
      ? or(
          lt(review.createdAt, input.cursor.createdAt),
          and(
            eq(review.createdAt, input.cursor.createdAt),
            lt(review.id, input.cursor.id),
          ),
        )
      : undefined;

    const rows = await db
      .select({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt,
        authorName: user.name,
      })
      .from(review)
      .innerJoin(user, eq(user.id, review.userId))
      .where(
        and(
          eq(review.productId, input.productId),
          eq(review.status, "approved"),
          cursor,
        ),
      )
      .orderBy(desc(review.createdAt), desc(review.id))
      .limit(REVIEWS_PER_PAGE + 1);

    return toReviewPage(
      rows.map(({ authorName, ...item }) => ({
        ...item,
        authorLabel: reviewAuthorLabel(authorName),
      })),
    );
  }),

  /** The ambient User's persisted Review state or delivered-order eligibility. */
  writingState: protectedProcedure
    .input(productInput)
    .query(async ({ ctx, input }) => {
      const existingStatus = await findReviewStatus(db, {
        userId: ctx.auth.user.id,
        productId: input.productId,
      });

      const qualifyingOrder = existingStatus
        ? undefined
        : await findQualifyingOrder(db, {
            userId: ctx.auth.user.id,
            productId: input.productId,
          });

      return {
        state: reviewWritingState({
          existingStatus,
          hasDeliveredOrder: qualifyingOrder !== undefined,
        }),
      };
    }),

  /** Create one pending Review after proving active Product and delivered ownership. */
  create: protectedProcedure
    .input(reviewSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const [activeProduct] = await tx
          .select({ id: product.id })
          .from(product)
          .where(and(eq(product.id, input.productId), eq(product.status, "active")))
          .limit(1)
          .for("share");

        if (!activeProduct) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Este produto não está disponível para avaliação.",
          });
        }

        const existingStatus = await findReviewStatus(tx, {
          userId: ctx.auth.user.id,
          productId: input.productId,
        });

        if (existingStatus) throw duplicateReview();

        const qualifyingOrder = await findQualifyingOrder(tx, {
          userId: ctx.auth.user.id,
          productId: input.productId,
          lock: true,
        });

        if (!qualifyingOrder) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas compras entregues podem ser avaliadas.",
          });
        }

        const [created] = await tx
          .insert(review)
          .values({
            productId: input.productId,
            userId: ctx.auth.user.id,
            orderId: qualifyingOrder.id,
            rating: input.rating,
            title: input.title,
            body: input.body,
            status: "pending",
          })
          .onConflictDoNothing({ target: [review.userId, review.productId] })
          .returning({ id: review.id });

        if (!created) throw duplicateReview();

        return { id: created.id, status: "pending" as const };
      }),
    ),
});
