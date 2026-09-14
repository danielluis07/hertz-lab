import type { RouterOutput } from "@/trpc/routers/_app";

/** One saved Variant of `wishlist.list`, with its current Catalog facts. */
export type WishlistItem = RouterOutput["wishlist"]["list"]["items"][number];
