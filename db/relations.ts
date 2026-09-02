import { defineRelations } from "drizzle-orm";
import * as schema from "@/db/schema";

/**
 * Drizzle 1.0 defines relations once for the whole schema rather than per
 * table. Wired into `drizzle()` in `db/index.ts`; without it, `db.query` and
 * the relational query builder do not exist.
 */
export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    customerProfile: r.one.customerProfile({
      from: r.user.id,
      to: r.customerProfile.userId,
    }),
    addresses: r.many.address(),
    cart: r.one.cart({ from: r.user.id, to: r.cart.userId }),
    orders: r.many.order(),
    reviews: r.many.review(),
    wishlistItems: r.many.wishlistItem(),
  },

  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  customerProfile: {
    user: r.one.user({
      from: r.customerProfile.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  address: {
    user: r.one.user({
      from: r.address.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  wishlistItem: {
    user: r.one.user({
      from: r.wishlistItem.userId,
      to: r.user.id,
      optional: false,
    }),
    variant: r.one.productVariant({
      from: r.wishlistItem.variantId,
      to: r.productVariant.id,
      optional: false,
    }),
  },

  // --- Catalog ---

  brand: {
    products: r.many.product(),
  },

  category: {
    parent: r.one.category({
      from: r.category.parentId,
      to: r.category.id,
      alias: "category_parent",
    }),
    children: r.many.category({
      from: r.category.id,
      to: r.category.parentId,
      alias: "category_parent",
    }),
    products: r.many.product(),
  },

  product: {
    brand: r.one.brand({
      from: r.product.brandId,
      to: r.brand.id,
      optional: false,
    }),
    category: r.one.category({
      from: r.product.categoryId,
      to: r.category.id,
      optional: false,
    }),
    variants: r.many.productVariant(),
    images: r.many.productImage(),
    specifications: r.many.productSpecification(),
    reviews: r.many.review(),
  },

  productVariant: {
    product: r.one.product({
      from: r.productVariant.productId,
      to: r.product.id,
      optional: false,
    }),
    images: r.many.productImage(),
  },

  productImage: {
    product: r.one.product({
      from: r.productImage.productId,
      to: r.product.id,
      optional: false,
    }),
    variant: r.one.productVariant({
      from: r.productImage.variantId,
      to: r.productVariant.id,
    }),
  },

  productSpecification: {
    product: r.one.product({
      from: r.productSpecification.productId,
      to: r.product.id,
      optional: false,
    }),
  },

  // --- Cart ---

  cart: {
    user: r.one.user({ from: r.cart.userId, to: r.user.id, optional: false }),
    items: r.many.cartItem(),
  },

  cartItem: {
    cart: r.one.cart({
      from: r.cartItem.cartId,
      to: r.cart.id,
      optional: false,
    }),
    variant: r.one.productVariant({
      from: r.cartItem.variantId,
      to: r.productVariant.id,
      optional: false,
    }),
  },

  // --- Order ---

  order: {
    user: r.one.user({ from: r.order.userId, to: r.user.id, optional: false }),
    items: r.many.orderItem(),
    statusHistory: r.many.orderStatusHistory(),
    payments: r.many.payment(),
    coupon: r.one.coupon({ from: r.order.couponId, to: r.coupon.id }),
    shippingMethod: r.one.shippingMethod({
      from: r.order.shippingMethodId,
      to: r.shippingMethod.id,
    }),
    couponRedemption: r.one.couponRedemption({
      from: r.order.id,
      to: r.couponRedemption.orderId,
    }),
  },

  orderItem: {
    order: r.one.order({
      from: r.orderItem.orderId,
      to: r.order.id,
      optional: false,
    }),
    variant: r.one.productVariant({
      from: r.orderItem.variantId,
      to: r.productVariant.id,
      optional: false,
    }),
  },

  orderStatusHistory: {
    order: r.one.order({
      from: r.orderStatusHistory.orderId,
      to: r.order.id,
      optional: false,
    }),
    changedBy: r.one.user({
      from: r.orderStatusHistory.changedByUserId,
      to: r.user.id,
    }),
  },

  shippingMethod: {
    orders: r.many.order(),
  },

  coupon: {
    redemptions: r.many.couponRedemption(),
  },

  couponRedemption: {
    coupon: r.one.coupon({
      from: r.couponRedemption.couponId,
      to: r.coupon.id,
      optional: false,
    }),
    user: r.one.user({
      from: r.couponRedemption.userId,
      to: r.user.id,
      optional: false,
    }),
    order: r.one.order({
      from: r.couponRedemption.orderId,
      to: r.order.id,
      optional: false,
    }),
  },

  // --- Payment ---

  payment: {
    order: r.one.order({
      from: r.payment.orderId,
      to: r.order.id,
      optional: false,
    }),
  },

  // --- Content ---

  review: {
    product: r.one.product({
      from: r.review.productId,
      to: r.product.id,
      optional: false,
    }),
    user: r.one.user({ from: r.review.userId, to: r.user.id, optional: false }),
    order: r.one.order({
      from: r.review.orderId,
      to: r.order.id,
      optional: false,
    }),
  },
}));
