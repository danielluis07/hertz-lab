import type { Metadata } from "next";
import { caller } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Áudio e eletrônicos",
};

const HomePage = async () => {
  const categoriesPromise = caller.categories.shop.roots();
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
