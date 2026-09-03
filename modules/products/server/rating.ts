import "server-only";

import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { product, review } from "@/db/schema";

/**
 * A transaction handle, derived from `db` so it cannot drift from the driver.
 * The caller supplies it: this must run in the *same* transaction as the write
 * that triggered it.
 */
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Rebuild a Product's `rating_average` (hundredths) and `rating_count` from
 * the approved Reviews, from scratch.
 *
 * Not a procedure, deliberately. It is the reviews module's trigger and the
 * products module's rule: ADR-0004 requires the recalculation to be atomic
 * with the moderation that causes it, so it cannot be a second procedure call
 * — and it writes a `product` row, so it must not live in `reviews`. ADR-0020
 * is what lets `modules/reviews/server/` import it.
 *
 * **Nothing else in the app may write those two columns.** Rebuilding from
 * scratch rather than adjusting by a delta is what makes drift repairable: run
 * it and the columns are correct again, whatever they said before.
 */
export async function recalculateProductRating(
  tx: Transaction,
  productId: string,
): Promise<void> {
  // Take the row lock *before* the aggregate. Under READ COMMITTED two
  // moderations of the same Product would otherwise each count the approved
  // Reviews without seeing the other's uncommitted one, and the second UPDATE
  // would overwrite the first with a total short by a review. Locking here
  // makes the second transaction wait, and its aggregate — a fresh snapshot
  // taken once the first commits — then includes that review.
  await tx
    .select({ id: product.id })
    .from(product)
    .where(eq(product.id, productId))
    .for("update");

  // Rounded in Postgres rather than in JS: `avg` is numeric, and taking it
  // through a float to get there is how a 4.50 becomes a 4.49.
  const [rating] = await tx
    .select({
      count: count(),
      average: sql<number>`coalesce(round(avg(${review.rating}) * 100), 0)::int`,
    })
    .from(review)
    .where(and(eq(review.productId, productId), eq(review.status, "approved")));

  await tx
    .update(product)
    .set({
      ratingAverage: rating?.average ?? 0,
      ratingCount: rating?.count ?? 0,
    })
    .where(eq(product.id, productId));
}
