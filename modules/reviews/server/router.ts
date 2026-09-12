import "server-only";

import { createTRPCRouter } from "@/trpc/init";
import { shopRouter } from "@/modules/reviews/server/shop";

/** The admin half will join this two-audience module when moderation is built. */
export const reviewsRouter = createTRPCRouter({
  shop: shopRouter,
});
