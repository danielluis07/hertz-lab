import type { BreadcrumbItem } from "@/components/breadcrumb";
import { categoryTrail } from "@/modules/categories/breadcrumb";

/**
 * The product page's trail: `Início › Produtos › <raiz> › <filho> › <Produto>`,
 * with the root segment collapsed when the Product's Category is itself a root
 * (`docs/STOREFRONT.md`, ADR-0053). It is the only upward path from a Product
 * to its Category — the header's root links have no dropdown (ADR-0042) — and
 * the visible counterpart of the page's `BreadcrumbList`, so both must be
 * built from this one list.
 *
 * Everything up to the Category is `categoryTrail`, the same list the
 * Category route ends on.
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
  return [
    ...categoryTrail(product.category),
    { label: product.name, href: null },
  ];
}
