import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "@/db/schema/columns";
import { user } from "@/db/schema/auth";
import { brazilianStateEnum } from "@/db/schema/customer";
import { productVariant } from "@/db/schema/catalog";

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "credit_card",
  "boleto",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
  "refunded",
  "cancelled",
]);

export const couponTypeEnum = pgEnum("coupon_type", [
  "percentage",
  "fixed_amount",
  "free_shipping",
]);

// ============================================================================
// CART
// ============================================================================

/** Exactly one per User. Emptied, never deleted. */
export const cart = pgTable("cart", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps(),
});

/** Carries no price: a Cart always reflects current prices. See ADR-0003. */
export const cartItem = pgTable(
  "cart_item",
  {
    id: id(),
    cartId: text("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("cart_item_variant_unique").on(t.cartId, t.variantId),
    check("cart_item_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

// ============================================================================
// SHIPPING AND DISCOUNTS
// ============================================================================

export const shippingMethod = pgTable("shipping_method", {
  id: id(),
  /** pt-BR, shown at checkout: "SEDEX". */
  name: text("name").notNull(),
  carrier: text("carrier").notNull(),
  /** BRL cents. */
  baseCostAmount: integer("base_cost_amount").notNull(),
  estimatedDeliveryDays: integer("estimated_delivery_days").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
});

export const coupon = pgTable(
  "coupon",
  {
    id: id(),
    /** Uppercase. */
    code: text("code").notNull().unique(),
    type: couponTypeEnum("type").notNull(),
    /**
     * Basis points for `percentage` (1000 = 10%), BRL cents for
     * `fixed_amount`, ignored for `free_shipping`.
     */
    value: integer("value").notNull().default(0),
    /** BRL cents. */
    minOrderAmount: integer("min_order_amount"),
    /** Null means unlimited. */
    maxUses: integer("max_uses"),
    maxUsesPerUser: integer("max_uses_per_user"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [check("coupon_window_ordered", sql`${t.endsAt} > ${t.startsAt}`)],
);

// ============================================================================
// ORDER
// ============================================================================

export const order = pgTable(
  "order",
  {
    id: id(),
    /** Human-facing: rendered "#001234". Leaks order volume, accepted. */
    number: integer("number")
      .generatedAlwaysAsIdentity({ startWith: 1000 })
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending_payment"),

    // --- Buyer snapshot (ADR-0003) ---
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    /** CPF, 11 digits, unformatted. */
    customerDocument: text("customer_document").notNull(),

    // --- Shipping address snapshot (ADR-0003) ---
    shippingRecipientName: text("shipping_recipient_name").notNull(),
    shippingPostalCode: text("shipping_postal_code").notNull(),
    shippingStreet: text("shipping_street").notNull(),
    shippingNumber: text("shipping_number").notNull(),
    shippingComplement: text("shipping_complement"),
    shippingNeighborhood: text("shipping_neighborhood").notNull(),
    shippingCity: text("shipping_city").notNull(),
    shippingState: brazilianStateEnum("shipping_state").notNull(),
    shippingReferencePoint: text("shipping_reference_point"),

    // --- Delivery snapshot (ADR-0003) ---
    shippingMethodId: text("shipping_method_id").references(
      () => shippingMethod.id,
      { onDelete: "set null" },
    ),
    shippingMethodName: text("shipping_method_name").notNull(),
    estimatedDeliveryDays: integer("estimated_delivery_days").notNull(),
    trackingCode: text("tracking_code"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    // --- Money, all BRL cents ---
    subtotalAmount: integer("subtotal_amount").notNull(),
    discountAmount: integer("discount_amount").notNull().default(0),
    shippingAmount: integer("shipping_amount").notNull(),
    totalAmount: integer("total_amount").generatedAlwaysAs(
      (): SQL =>
        sql`${order.subtotalAmount} - ${order.discountAmount} + ${order.shippingAmount}`,
    ),

    // --- Discount snapshot (ADR-0003) ---
    couponId: text("coupon_id").references(() => coupon.id, {
      onDelete: "set null",
    }),
    couponCode: text("coupon_code"),

    ...timestamps(),
  },
  (t) => [
    uniqueIndex("order_number_unique").on(t.number),
    index("order_user_idx").on(t.userId),
    index("order_status_idx").on(t.status),
  ],
);

/** Snapshots what was bought, so archiving a Product cannot rewrite history. */
export const orderItem = pgTable(
  "order_item",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    variantName: text("variant_name").notNull(),
    sku: text("sku").notNull(),
    /** BRL cents, as charged. */
    unitPriceAmount: integer("unit_price_amount").notNull(),
    quantity: integer("quantity").notNull(),
    totalAmount: integer("total_amount").generatedAlwaysAs(
      (): SQL => sql`${orderItem.unitPriceAmount} * ${orderItem.quantity}`,
    ),
    ...timestamps(),
  },
  (t) => [
    index("order_item_order_idx").on(t.orderId),
    check("order_item_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    note: text("note"),
    /** Null when the system moved the Order, e.g. on a payment webhook. */
    changedByUserId: text("changed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

/** One use of a Coupon. Without these rows, per-user limits are unenforceable. */
export const couponRedemption = pgTable(
  "coupon_redemption",
  {
    id: id(),
    couponId: text("coupon_id")
      .notNull()
      .references(() => coupon.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("coupon_redemption_order_unique").on(t.couponId, t.orderId),
    index("coupon_redemption_user_idx").on(t.couponId, t.userId),
  ],
);

// ============================================================================
// PAYMENT
// ============================================================================

export const payment = pgTable(
  "payment",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    /** Provider-agnostic on purpose. See ADR-0002. */
    provider: text("provider").notNull().default("mercado_pago"),
    providerPaymentId: text("provider_payment_id"),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    /** BRL cents. */
    amount: integer("amount").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Raw provider body, so a dispute is reconstructible. */
    providerPayload: jsonb("provider_payload"),
    ...timestamps(),
  },
  (t) => [
    index("payment_order_idx").on(t.orderId),
    uniqueIndex("payment_provider_id_unique")
      .on(t.provider, t.providerPaymentId)
      .where(sql`${t.providerPaymentId} is not null`),
  ],
);

/**
 * Webhook delivery is at-least-once. The unique key turns idempotency into an
 * insert that either succeeds or conflicts. See ADR-0002.
 */
export const paymentWebhookEvent = pgTable(
  "payment_webhook_event",
  {
    id: id(),
    provider: text("provider").notNull().default("mercado_pago"),
    providerEventId: text("provider_event_id").notNull(),
    payload: jsonb("payload").notNull(),
    /** Null until the event has been acted on. */
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("payment_webhook_event_unique").on(
      t.provider,
      t.providerEventId,
    ),
  ],
);
