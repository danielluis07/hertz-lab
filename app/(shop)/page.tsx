import type { Metadata } from "next";
import { getRootCategories } from "@/modules/categories/shop";
import { caller } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Áudio e eletrônicos",
};

const HomePage = async () => {
  // Keep fetching coordinated here: each Product ranking needs the earlier
  // sections' ids to exclude duplicates before its limit and still backfill.
  // Streaming would reveal results sooner during a request-time render, but
  // would not remove this dependency. This public route prerenders and caches
  // its complete output (ADR-0031), so cache hits do not await these queries.
  // Categories run alongside the chain; the shared memoized read also serves
  // the header and footer without another query in the same render.
  const categoriesPromise = getRootCategories();
  const productPreviewsPromise = (async () => {
    const promotions = await caller.products.shop.promotions();
    const bestSellers = await caller.products.shop.bestSellers({
      excludeProductIds: promotions.map(({ id }) => id),
    });
    const newest = await caller.products.shop.newest({
      excludeProductIds: [...promotions, ...bestSellers].map(({ id }) => id),
    });
    const topRated = await caller.products.shop.topRated({
      excludeProductIds: [...promotions, ...bestSellers, ...newest].map(
        ({ id }) => id,
      ),
    });

    return { promotions, bestSellers, newest, topRated };
  })();

  const [categories, productPreviews] = await Promise.all([
    categoriesPromise,
    productPreviewsPromise,
  ]);

  // Prepared for the future home UI without crossing the Server Component boundary.
  void { categories, productPreviews };

  return <h1>Hertz Lab</h1>;
};

export default HomePage;
