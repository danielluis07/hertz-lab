import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { productBreadcrumb } from "@/modules/products/shop/breadcrumb";
import { ProductPurchase } from "@/modules/products/shop/components/product-purchase";
import { ProductSpecifications } from "@/modules/products/shop/components/product-specifications";
import { RelatedProducts } from "@/modules/products/shop/components/related-products";
import { ReviewList } from "@/modules/reviews/shop/components/review-list";
import { ReviewWriter } from "@/modules/reviews/shop/components/review-writer";
import { caller } from "@/trpc/server";

/**
 * Every active slug renders on its first request and is cached from then on
 * (ADR-0035). The empty array is what makes the route revalidatable at
 * runtime; `dynamicParams` stays at its default `true`.
 *
 * The prerender holds only while this route reads no `searchParams`, no
 * cookies or headers and no `protectedProcedure` — which is why the Cart,
 * Wishlist and Review-writing state are cold client queries, and why there is
 * no `loading.tsx` beside it (ADR-0040).
 */
export function generateStaticParams() {
  return [];
}

const ProductPage = async ({ params }: PageProps<"/produto/[slug]">) => {
  const { slug } = await params;

  // Unknown, draft and archived are one hard 404, decided before any
  // secondary read starts.
  const product = await caller.products.shop.bySlug({ slug });
  if (!product) notFound();

  const [reviews, related] = await Promise.all([
    caller.reviews.shop.list({ productId: product.id }),
    caller.products.shop.related({
      productId: product.id,
      categoryId: product.categoryId,
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-6 pt-6 pb-16 md:pb-24">
      <Breadcrumb items={productBreadcrumb(product)} />

      <div className="pt-8 md:pt-10">
        {/* Only what Gallery and Buy panel render crosses into the client. */}
        <ProductPurchase
          product={{
            slug: product.slug,
            name: product.name,
            brandName: product.brandName,
            ratingAverage: product.ratingAverage,
            ratingCount: product.ratingCount,
            variants: product.variants,
            images: product.images,
          }}
        />
      </div>

      <div className="flex flex-col gap-16 pt-16 md:gap-24 md:pt-24">
        {product.specifications.length > 0 && (
          <section
            aria-labelledby="produto-especificacoes"
            className="flex flex-col gap-6">
            <h2 id="produto-especificacoes" className="border-t pt-6 text-xl font-medium tracking-tight md:text-2xl">
              Especificações
            </h2>
            <ProductSpecifications specifications={product.specifications} />
          </section>
        )}

        <section
          aria-labelledby="produto-descricao"
          className="flex flex-col gap-6">
          <h2 id="produto-descricao" className="border-t pt-6 text-xl font-medium tracking-tight md:text-2xl">
            Descrição
          </h2>
          {/* The Admin's line breaks are the paragraphs. */}
          <p className="max-w-prose text-base whitespace-pre-line">
            {product.description}
          </p>
        </section>

        {/* Present with no approved Reviews, because an entitled shopper may
            write the first one. The Buy panel's rating summary links here. */}
        <section
          id="avaliacoes"
          aria-labelledby="produto-avaliacoes"
          className="flex scroll-mt-8 flex-col gap-8">
          <h2 id="produto-avaliacoes" className="border-t pt-6 text-xl font-medium tracking-tight md:text-2xl">
            Avaliações
          </h2>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div className="min-w-0">
              {reviews.items.length > 0 ? (
                <ReviewList productId={product.id} page={reviews} />
              ) : (
                <div className="flex flex-col gap-1 border-y py-8">
                  <p className="font-medium">
                    Este produto ainda não tem avaliações.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Avaliações são escritas por quem recebeu o produto e
                    aparecem aqui depois da moderação.
                  </p>
                </div>
              )}
            </div>
            <div className="lg:self-start">
              <ReviewWriter productId={product.id} />
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section
            aria-labelledby="produto-relacionados"
            className="flex flex-col gap-8">
            <h2 id="produto-relacionados" className="border-t pt-6 text-xl font-medium tracking-tight md:text-2xl">
              Produtos relacionados
            </h2>
            <RelatedProducts products={related} />
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
