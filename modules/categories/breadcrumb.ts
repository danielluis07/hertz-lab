import type { BreadcrumbItem } from "@/components/breadcrumb";
import { categoryPath } from "@/modules/categories/paths";

type BreadcrumbCategory = {
  name: string;
  slug: string;
  /** Both `null` for a root: a two-level tree's parent is always a root. */
  parentName: string | null;
  parentSlug: string | null;
};

/**
 * `Início › Produtos › <raiz> › <filho>`, every item a link, with the root
 * segment collapsed when the Category is itself a root (ADR-0053).
 *
 * At the module root because two routes render it: the Category route ends
 * its trail here, and the product page (`modules/products/shop/breadcrumb.ts`)
 * continues it to the Product. One list, so the two cannot disagree about the
 * way up — and each is the visible counterpart of its page's `BreadcrumbList`.
 */
export function categoryTrail(category: BreadcrumbCategory): BreadcrumbItem[] {
  return [
    ...categoryAncestors(category),
    { label: category.name, href: categoryPath(category) },
  ];
}

/** The Category route's own trail: the same list, ending on the page itself. */
export function categoryBreadcrumb(
  category: BreadcrumbCategory,
): BreadcrumbItem[] {
  return [...categoryAncestors(category), { label: category.name, href: null }];
}

function categoryAncestors(category: BreadcrumbCategory): BreadcrumbItem[] {
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
  ];
}
