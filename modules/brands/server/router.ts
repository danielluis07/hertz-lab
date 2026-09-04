import "server-only";

import { createTRPCRouter } from "@/trpc/init";
import { adminRouter } from "@/modules/brands/server/admin";

/**
 * Composed into `trpc/routers/_app.ts` under the module's own name, so the
 * router key and the module are the same word: `trpc.brands.admin.options`.
 * The audience is nested even though only one procedure exists yet — a Brand
 * has a shop half (`docs/MODULES.md`), and moving the key later would move
 * every caller with it.
 */
export const brandsRouter = createTRPCRouter({
  admin: adminRouter,
});
