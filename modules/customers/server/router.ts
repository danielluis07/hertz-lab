import "server-only";

import { shopRouter } from "@/modules/customers/server/shop";
import { createTRPCRouter } from "@/trpc/init";

/** The Customer module surface, composed as `trpc.customers.shop.*`. */
export const customersRouter = createTRPCRouter({
  shop: shopRouter,
});
