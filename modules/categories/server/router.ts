import "server-only";

import { createTRPCRouter } from "@/trpc/init";
import { adminRouter } from "@/modules/categories/server/admin";

/** `trpc.categories.admin.options`. See `modules/brands/server/router.ts`. */
export const categoriesRouter = createTRPCRouter({
  admin: adminRouter,
});
