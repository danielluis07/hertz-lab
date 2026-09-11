import { createTRPCRouter } from "@/trpc/init";
import { brandsRouter } from "@/modules/brands/server/router";
import { cartRouter } from "@/modules/cart/server/router";
import { categoriesRouter } from "@/modules/categories/server/router";
import { productsRouter } from "@/modules/products/server/router";
import type { inferRouterOutputs } from "@trpc/server";

export const appRouter = createTRPCRouter({
  brands: brandsRouter,
  cart: cartRouter,
  categories: categoriesRouter,
  products: productsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutput = inferRouterOutputs<AppRouter>;
