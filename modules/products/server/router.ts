import "server-only";

import { createTRPCRouter } from "@/trpc/init";
import { adminRouter } from "@/modules/products/server/admin";

/**
 * Composed into `trpc/routers/_app.ts` under the module's own name, so the
 * router key and the module are the same word: `trpc.products.admin.list`,
 * never `productsAdmin`. Nesting the audience is also what gives invalidation
 * a hierarchy — `trpc.products.pathFilter()` reaches both audiences.
 */
export const productsRouter = createTRPCRouter({
  admin: adminRouter,
});
