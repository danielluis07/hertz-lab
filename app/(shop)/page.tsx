import type { Metadata } from "next";
import { getRootCategories } from "@/modules/categories/shop";
import { CategoryGrid } from "@/modules/categories/shop/components/category-grid";
import { ProductPreview } from "@/modules/products/shop/components/product-preview";
import { caller } from "@/trpc/server";
import { Hero } from "@/components/shop/hero";

export const metadata: Metadata = {
  title: "Áudio e eletrônicos",
};

const HOME_FEATURED_CATEGORY_SLUG = "fones-de-ouvido";

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

  const [categories, { promotions, bestSellers, newest, topRated }] =
    await Promise.all([categoriesPromise, productPreviewsPromise]);
  const homeCategories = categories.toSorted(
    (a, b) =>
      Number(b.slug === HOME_FEATURED_CATEGORY_SLUG) -
      Number(a.slug === HOME_FEATURED_CATEGORY_SLUG),
  );

  return (
    <>
      <Hero />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
        {/*
          Serviço: what buying here involves, from the list `/sobre` renders
          too (`lib/store.ts`). A panel of labelled readings between hairlines,
          not a row of trust badges — no icons, no accent, no motion: the
          Hero's link stays the page's one vermilion element (DESIGN.md).
        */}
        {/* <section aria-labelledby="home-servico">
          <h2 id="home-servico" className="sr-only">
            Comprando na {STORE.name}
          </h2>
          <dl className="grid divide-y border-y md:grid-cols-3 md:divide-x md:divide-y-0">
            {BUYING_FACTS.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-col gap-2 py-6 md:px-6 md:first:pl-0 md:last:pr-0">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                  {fact.label}
                </dt>
                <dd className="text-sm leading-6">
                  {fact.text}
                  {fact.link && (
                    <>
                      {" "}
                      {fact.link.lead}{" "}
                      <Link
                        href={fact.link.href}
                        className="decoration-muted-foreground hover:decoration-foreground underline decoration-1 underline-offset-4 transition-colors duration-150 ease-out motion-reduce:transition-none">
                        {fact.link.label}
                      </Link>
                      .
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
          */}
        <CategoryGrid
          categories={homeCategories}
          featuredSlug={HOME_FEATURED_CATEGORY_SLUG}
        />

        <ProductPreview
          heading="Promoções"
          href="/produtos?promocao=1&ordenar=maior-desconto"
          products={promotions}
        />
        <ProductPreview
          heading="Mais vendidos"
          href="/produtos?ordenar=mais-vendidos"
          products={bestSellers}
        />
        <ProductPreview
          heading="Novidades"
          href="/produtos?ordenar=recentes"
          products={newest}
        />
        <ProductPreview
          heading="Mais bem avaliados"
          href="/produtos?ordenar=avaliados"
          products={topRated}
        />
      </div>
    </>
  );
};

export default HomePage;
