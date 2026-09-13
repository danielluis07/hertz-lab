import "server-only";

import { shopRouter } from "@/modules/orders/server/shop";
import { createTRPCRouter } from "@/trpc/init";

/** The Orders module surface, composed as `trpc.orders.shop.*`. */
export const ordersRouter = createTRPCRouter({
  shop: shopRouter,
});
