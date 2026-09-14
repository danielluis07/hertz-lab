import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import type { BreadcrumbItem } from "@/modules/products/shop/breadcrumb";

/**
 * The product page's trail, as server markup. The items are
 * `productBreadcrumb`'s — this only lays them out: muted links, ink for the
 * page the shopper is on, a chevron between.
 */
export function ProductBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
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
