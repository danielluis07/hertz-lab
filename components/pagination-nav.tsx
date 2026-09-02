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
}: {
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
}) {
  if (totalPages <= 1) return null;

  // `buildPageRange` clamps internally, so an out-of-range `page` — a shopper
  // editing ?pagina= by hand — would otherwise leave the nav with no active
  // link and a previous/next pointing off the end.
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const items = buildPageRange({ page: currentPage, totalPages, siblings });
  const hrefFor = (target: number) =>
    buildPageHref({ pathname, searchParams, key: paramKey, page: target });

  return (
    <Pagination>
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious href={hrefFor(currentPage - 1)} />
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
                isActive={item === currentPage}
                href={hrefFor(item)}>
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext href={hrefFor(currentPage + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
