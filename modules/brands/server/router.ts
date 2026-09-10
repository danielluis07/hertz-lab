import "server-only";

import { createTRPCRouter } from "@/trpc/init";
import { adminRouter } from "@/modules/brands/server/admin";
import { shopRouter } from "@/modules/brands/server/shop";

/**
 * Composed into `trpc/routers/_app.ts` under the module's own name, so the
 * router key and the module are the same word: `trpc.brands.admin.list`,
 * `trpc.brands.shop.options`.
 */
export const brandsRouter = createTRPCRouter({
  admin: adminRouter,
  shop: shopRouter,
});
