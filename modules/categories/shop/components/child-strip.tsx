import Link from "next/link";
import { CatalogImage } from "@/components/catalog-image";
import { cn } from "@/lib/utils";
import { categoryPath } from "@/modules/categories/paths";

/**
 * A root Category page's children, as links above the catalogue — the only
 * place a child Category is discovered, because the header carries flat root
 * links and no dropdown (ADR-0042).
 *
 * **Renders nothing for an empty list**, and that is how a child page goes
 * without one: a child has no children (ADR-0022), so the page passes the
 * same array on both levels and never branches (ADR-0043).
 *
 * The picture is a small mark beside the name, as on the home strip: the
 * photographs on this page are the Products'. It is decorative — the link is
 * named by the Category (ADR-0021). On a phone the strip scrolls sideways
 * edge to edge rather than stacking a column of links above the grid.
 */
export function CategoryChildStrip({
  parentSlug,
  categories,
}: {
  /** The page's own Category: every child's path is built on it. */
  parentSlug: string;
  categories: { id: string; name: string; slug: string; imageS3Key: string | null }[];
}) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Subcategorias">
      <ul className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Link
              href={categoryPath({ slug: category.slug, parentSlug })}
              className={cn(
                "hover:bg-muted flex h-14 items-center gap-3 rounded-lg border pr-4 transition-colors duration-150 ease-out motion-reduce:transition-none",
                category.imageS3Key ? "pl-2" : "pl-4",
              )}>
              {category.imageS3Key && (
                <div className="size-10 shrink-0 overflow-hidden rounded-sm">
                  <CatalogImage s3Key={category.imageS3Key} alt="" sizes="40px" />
                </div>
              )}
              <span className="text-sm font-medium whitespace-nowrap">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
