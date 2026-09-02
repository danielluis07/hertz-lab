import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "@/db/schema/columns";
import { user } from "@/db/schema/auth";
import { product } from "@/db/schema/catalog";
import { order } from "@/db/schema/commerce";

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

/**
 * Always tied to the delivered Order that entitles its author to write it, so
 * "compra verificada" is a fact in the schema rather than a badge in the UI.
 * Approving or rejecting one must recalculate the Product's rating: ADR-0004.
 */
export const review = pgTable(
  "review",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The proof of purchase. */
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("review_user_product_unique").on(t.userId, t.productId),
    index("review_product_idx")
      .on(t.productId)
      .where(sql`${t.status} = 'approved'`),
    check("review_rating_range", sql`${t.rating} between 1 and 5`),
  ],
);
