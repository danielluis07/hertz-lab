import { customType, text, timestamp } from "drizzle-orm/pg-core";

export const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7());

export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Postgres `tsvector`. Drizzle has no built-in column type for it, and it is
 * only ever written by a generated column, so the TS side is read-only text.
 */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});
