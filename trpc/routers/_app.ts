import { createTRPCRouter } from "@/trpc/init";
import { brandsRouter } from "@/modules/brands/server/router";
import { cartRouter } from "@/modules/cart/server/router";
import { categoriesRouter } from "@/modules/categories/server/router";
import { customersRouter } from "@/modules/customers/server/router";
import { ordersRouter } from "@/modules/orders/server/router";
import { productsRouter } from "@/modules/products/server/router";
import { reviewsRouter } from "@/modules/reviews/server/router";
import { wishlistRouter } from "@/modules/wishlist/server/router";
import type { inferRouterOutputs } from "@trpc/server";

export const appRouter = createTRPCRouter({
  brands: brandsRouter,
  cart: cartRouter,
  categories: categoriesRouter,
  customers: customersRouter,
  orders: ordersRouter,
  products: productsRouter,
  reviews: reviewsRouter,
  wishlist: wishlistRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutput = inferRouterOutputs<AppRouter>;
