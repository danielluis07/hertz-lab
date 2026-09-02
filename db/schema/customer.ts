import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "@/db/schema/columns";
import { user } from "@/db/schema/auth";
import { productVariant } from "@/db/schema/catalog";

/** The 26 Brazilian states plus the Federal District. */
export const brazilianStateEnum = pgEnum("brazilian_state", [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
]);

/**
 * The commerce half of a person. Created lazily at first checkout, so its
 * presence means "this User has shopped". See CONTEXT.md: User vs Customer.
 */
export const customerProfile = pgTable("customer_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** CPF, 11 digits, stored unformatted. */
  document: text("document").notNull().unique(),
  phone: text("phone").notNull(),
  birthDate: date("birth_date"),
  ...timestamps(),
});

export const address = pgTable(
  "address",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientName: text("recipient_name").notNull(),
    /** CEP, 8 digits, stored unformatted. */
    postalCode: text("postal_code").notNull(),
    street: text("street").notNull(),
    /** Text, not a number: "s/n" is a valid house number in Brazil. */
    number: text("number").notNull(),
    complement: text("complement"),
    neighborhood: text("neighborhood").notNull(),
    city: text("city").notNull(),
    state: brazilianStateEnum("state").notNull(),
    referencePoint: text("reference_point"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
  },
  (t) => [index("address_user_idx").on(t.userId)],
);

/** One implicit list per User, so there is no parent wishlist row. */
export const wishlistItem = pgTable(
  "wishlist_item",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.variantId] }),
    index("wishlist_item_user_idx").on(t.userId),
  ],
);
