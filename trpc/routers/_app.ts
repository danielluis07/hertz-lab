import { createTRPCRouter } from "@/trpc/init";
import { productsRouter } from "@/modules/products/server/router";
import type { inferRouterOutputs } from "@trpc/server";

export const appRouter = createTRPCRouter({
  products: productsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutput = inferRouterOutputs<AppRouter>;
