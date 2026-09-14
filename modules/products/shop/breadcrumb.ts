import { categoryPath } from "@/modules/categories/paths";

export type BreadcrumbItem = {
  label: string;
  /** `null` for the last item: the page the shopper is on. */
  href: string | null;
};

/**
 * The product page's trail: `Início › Produtos › <raiz> › <filho> › <Produto>`,
 * with the root segment collapsed when the Product's Category is itself a root
 * (`docs/STOREFRONT.md`, ADR-0053). It is the only upward path from a Product
 * to its Category — the header's root links have no dropdown (ADR-0042) — and
 * the visible counterpart of the page's `BreadcrumbList`, so both must be
 * built from this one list.
 */
export function productBreadcrumb(product: {
  name: string;
  category: {
    name: string;
    slug: string;
    parentName: string | null;
    parentSlug: string | null;
  };
}): BreadcrumbItem[] {
  const { category } = product;

  return [
    { label: "Início", href: "/" },
    { label: "Produtos", href: "/produtos" },
    ...(category.parentSlug !== null && category.parentName !== null
      ? [
          {
            label: category.parentName,
            href: categoryPath({ slug: category.parentSlug, parentSlug: null }),
          },
        ]
      : []),
    { label: category.name, href: categoryPath(category) },
    { label: product.name, href: null },
  ];
}
