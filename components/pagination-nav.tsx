import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { buildPageHref, buildPageRange } from "@/lib/utils/pagination";

type PaginationNavProps = {
  pathname: string;
  searchParams: URLSearchParams;
  /**
   * The page parameter's name. ADR-0005: `pagina` on public routes, `page` on
   * admin ones. Taking it as a prop is what keeps this component shared.
   */
  paramKey: string;
  page: number;
  totalPages: number;
  siblings?: number;
};

/**
 * The assembled pagination nav. `components/ui/pagination.tsx` renders parts
 * and computes nothing; this puts them together so no page has to.
 *
 * Deliberately not a client component: every link is an href, so a paginated
 * grid ships no JavaScript for its pagination.
 */
export function PaginationNav({
  pathname,
  searchParams,
  paramKey,
  page,
  totalPages,
  siblings,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  const items = buildPageRange({ page, totalPages, siblings });
  const hrefFor = (target: number) =>
    buildPageHref({ pathname, searchParams, key: paramKey, page: target });

  return (
    <Pagination>
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={hrefFor(page - 1)} />
          </PaginationItem>
        )}

        {items.map((item, index) =>
          item === "ellipsis" ? (
            // Ellipses have no identity of their own; there are at most two.
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                isActive={item === page}
                href={hrefFor(item)}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        {page < totalPages && (
          <PaginationItem>
            <PaginationNext href={hrefFor(page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
