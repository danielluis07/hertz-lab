import type { RouterOutput } from "@/trpc/routers/_app";

/** One page of `reviews.shop.list`, as the Product page reads it through `caller`. */
export type ReviewListPage = RouterOutput["reviews"]["shop"]["list"];

/** One approved, publicly labelled Review. */
export type ReviewListItem = ReviewListPage["items"][number];
