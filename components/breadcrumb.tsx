import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  /** `null` for the last item: the page the shopper is on. */
  href: string | null;
};

/**
 * A Storefront trail, as server markup: muted links, ink for the page the
 * shopper is on, a chevron between. It knows only the shape of a trail — which
 * items a page has is its module's rule (`modules/categories/breadcrumb.ts`,
 * `modules/products/shop/breadcrumb.ts`). Promoted out of `products` when
 * `categories` became the second module to need it, knowing no rule
 * (`docs/MODULES.md`, "Promotion").
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {items.map((item, index) => (
          <li key={item.href ?? "atual"} className="flex min-w-0 items-center gap-2">
            {index > 0 && (
              <ChevronRightIcon aria-hidden className="size-3.5 shrink-0" />
            )}
            {item.href === null ? (
              <span aria-current="page" className="text-foreground truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:underline motion-reduce:transition-none">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
