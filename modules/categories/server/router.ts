import "server-only";

import { createTRPCRouter } from "@/trpc/init";
import { adminRouter } from "@/modules/categories/server/admin";
import { shopRouter } from "@/modules/categories/server/shop";

/**
 * `trpc.categories.admin.list`, `trpc.categories.shop.roots`. See
 * `modules/brands/server/router.ts`.
 */
export const categoriesRouter = createTRPCRouter({
  admin: adminRouter,
  shop: shopRouter,
});
