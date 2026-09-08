import "server-only";

import { createTRPCRouter } from "@/trpc/init";
import { adminRouter } from "@/modules/brands/server/admin";

/**
 * Composed into `trpc/routers/_app.ts` under the module's own name, so the
 * router key and the module are the same word: `trpc.brands.admin.list`.
 * The audience is nested even though every procedure here is an admin one so
 * far — a Brand has a shop half (`docs/MODULES.md`), and moving the key later
 * would move every caller with it.
 */
export const brandsRouter = createTRPCRouter({
  admin: adminRouter,
});
