import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { buttonVariants } from "@/components/ui/button";
import { getRootCategories } from "@/modules/categories/shop";
import { ProductPreview } from "@/modules/products/shop/components/product-preview";
import { caller } from "@/trpc/server";
import hero from "@/public/images/home-hero.jpg";

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

  const [categories, { promotions, bestSellers, newest, topRated }] =
    await Promise.all([categoriesPromise, productPreviewsPromise]);

  return (
    <>
      {/*
        The Hero (ADR-0028, DESIGN.md). The photograph is a subject centred on
        an empty ground, and the heading is set in that ground: split around
        her head at ear level, so the line reads *through* the headphones, one
        half per channel. The ground is near-white, so ink sits on it at full
        contrast with no scrim.

        That only holds where the side bands are wide enough to carry display
        type, and below `lg` they are not. There the photograph is dropped
        rather than stacked above the text: on a phone it would push the
        heading and the action below the fold for a picture the heading can
        no longer sit in, so the Hero is its type alone.

        The split is geometry, not guesswork: the box is 16:9 and only ever
        loses height to the 70svh cap, so the photograph always spans the
        viewport's width and her head always sits between 39vw and 61vw. The
        grid's middle column is that span plus air, in `vw`, so it stays on
        her at any width the container allows. `h1` is one element with two
        spans on a subgrid: a screen reader hears one sentence.
      */}
      <section className="relative">
        <div className="bg-muted relative hidden aspect-video max-h-[70svh] w-full overflow-hidden lg:block">
          <Image
            src={hero}
            alt=""
            preload
            // `hidden` does not stop a fetch: `preload` writes a `<link>` into
            // the head, and the browser downloads whatever candidate `sizes`
            // picks whatever the CSS says. So below `lg` it asks for 1vw, the
            // smallest rendition — tens of bytes — instead of a full-width
            // hero a phone never shows. Kept as `vw`, not `px`: Next only
            // emits candidates that small when the smallest `vw` value allows.
            sizes="(min-width: 1024px) 100vw, 1vw"
            placeholder="blur"
            // When the 70svh cap trims height, it trims the sweater, not the
            // headband.
            className="size-full object-cover object-[50%_20%]"
          />
        </div>

        <div className="mx-auto w-full max-w-7xl px-6 pt-12 md:pt-16 lg:absolute lg:inset-0 lg:grid lg:grid-cols-[1fr_26vw_1fr] lg:grid-rows-[34fr_auto_66fr] lg:py-0">
          <h1 className="text-5xl font-medium tracking-tight md:text-6xl lg:col-span-3 lg:row-start-2 lg:grid lg:grid-cols-subgrid">
            <span className="lg:text-right">Ouça cada</span>{" "}
            <span className="lg:col-start-3">detalhe.</span>
          </h1>

          <div className="mt-5 flex flex-col items-start gap-6 lg:col-start-3 lg:row-start-3 lg:mt-5">
            <p className="text-muted-foreground max-w-xs text-base">
              Fones, caixas de som e eletrônicos escolhidos pela ficha técnica.
            </p>
            {/* The page's one vermilion element (DESIGN.md). A link dressed
                as a button, not a `Button` rendering one, which would
                announce it with `role="button"`. */}
            <Link
              href="/produtos"
              className={buttonVariants({
                size: "lg",
                className: "h-10 px-4",
              })}>
              Explorar produtos
              <ArrowRightIcon aria-hidden data-icon="inline-end" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
        {categories.length > 0 && (
          <section
            aria-labelledby="home-categorias"
            className="flex flex-col gap-8">
            <h2
              id="home-categorias"
              className="border-t pt-6 text-xl font-medium tracking-tight md:text-2xl">
              Categorias
            </h2>

            {/* An index, not a gallery: the photographs below are the
                Products, so a root is a named row with its picture as a small
                mark beside the name — and a root with no picture is the same
                row without one, rather than a tile with a hole in it. */}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/produtos/${category.slug}`}
                    className="group/category hover:bg-muted flex min-h-20 items-center gap-4 rounded-lg border p-3 transition-colors duration-150 ease-out motion-reduce:transition-none">
                    {category.imageS3Key && (
                      <div className="size-14 shrink-0 overflow-hidden rounded-sm">
                        {/* Decorative: the link is named by the Category
                            (ADR-0021). */}
                        <CatalogImage
                          s3Key={category.imageS3Key}
                          alt=""
                          sizes="56px"
                        />
                      </div>
                    )}
                    <span className="flex-1 text-base font-medium">
                      {category.name}
                    </span>
                    <ArrowRightIcon
                      aria-hidden
                      className="text-muted-foreground group-hover/category:text-foreground size-4 shrink-0 transition-[color,translate] duration-150 ease-out group-hover/category:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
