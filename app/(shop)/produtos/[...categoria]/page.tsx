import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { categoryBreadcrumb } from "@/modules/categories/breadcrumb";
import {
  categoryPath,
  categorySlugFromPath,
  isCanonicalCategoryPath,
} from "@/modules/categories/paths";
import { CategoryChildStrip } from "@/modules/categories/shop/components/child-strip";
import { categorySubtreeIds } from "@/modules/categories/shop/subtree";
import { Catalog } from "@/modules/products/shop/components/catalog";
import { parseCatalogParams } from "@/modules/products/shop/schemas";
import { caller } from "@/trpc/server";

/**
 * A Category's canonical subtree (ADR-0043), over the same `<Catalog>` as
 * `/produtos`. The page owns the path, the heading block and the input.
 *
 * **Dynamic, and it always was**: the route reads `searchParams`, a
 * Request-time API. So it declares no `generateStaticParams` — one would buy
 * no prerender here, and a reader adding one would be expecting one
 * (ADR-0035).
 *
 * **A bad Category is a soft 404.** `produtos/loading.tsx` sits above this
 * segment, so the stream has started before `notFound()` runs and the status
 * cannot change; the `noindex` meta is what remains (ADR-0040). Accepted
 * deliberately — moving the `notFound()` earlier does nothing, and a route
 * group to escape the boundary would cost the prefetch on the route the
 * Categorias strip links to.
 */
const CategoryPage = async ({
  params,
  searchParams,
}: Omit<PageProps<"/produtos/[...categoria]">, "searchParams"> & {
  // Typed here for the reason `/produtos` gives: Next leaves it `Promise<any>`.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { categoria } = await params;

  // A path deeper than the tree is refused before anything is read.
  const slug = categorySlugFromPath(categoria);
  if (slug === null) notFound();

  const category = await caller.categories.shop.bySlug({ slug });

  // The path is validated, not merely used to find the row: a fabricated or
  // missing parent is a URL that never existed, so not a redirect either.
  if (!category || !isCanonicalCategoryPath(categoria, category)) notFound();

  // Parsed once, here, and passed down as a prop (ADR-0011). A dead `marca`
  // or a search matching nothing is a 200 with an empty catalogue: the path
  // is the resource, the query string is the view (ADR-0041).
  const input = parseCatalogParams(await searchParams);

  return (
    // `group`: the filter controls inside set `data-pending`, and the grid
    // wrapper in <Catalog> dims against it.
    <div className="group mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pt-6 pb-12 md:pb-16">
      <Breadcrumb items={categoryBreadcrumb(category)} />

      {/* The Category's picture is deliberately absent: it belongs to the
          home strip and its parent's child strip, never its own page
          (`docs/STOREFRONT.md`). */}
      <div className="flex flex-col gap-3 pt-2 md:pt-4">
        <h1 className="text-3xl font-medium tracking-tight break-words md:text-4xl">
          {category.name}
        </h1>
        {category.description && (
          // The Admin's line breaks are the paragraphs.
          <p className="text-muted-foreground max-w-prose text-base whitespace-pre-line">
            {category.description}
          </p>
        )}
      </div>

      <CategoryChildStrip
        parentSlug={category.slug}
        categories={category.children}
      />

      {/* The Category is a fixed narrowing in the path, not a filter chip,
          which is also why `Limpar filtros` to this pathname keeps it. */}
      <Catalog
        input={input}
        pathname={categoryPath(category)}
        categoryIds={categorySubtreeIds(category)}
      />
    </div>
  );
};

export default CategoryPage;
