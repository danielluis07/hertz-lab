"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EmptyRow, SortHeader, TableShell } from "@/components/data-table";
import { PaginationNav } from "@/components/pagination-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { formatRating } from "@/lib/utils/format";
import { buildPageHref } from "@/lib/utils/pagination";
import { buildSortHref } from "@/lib/utils/sort";
import type { ProductListInput } from "@/modules/products/admin/schemas";
import {
  PRODUCT_SORT_DEFAULTS,
  PRODUCT_STATUS_LABELS,
  PRODUCTS_PER_PAGE,
  type ProductSortField,
  type ProductStatus,
} from "@/modules/products/constants";
import { useTRPC } from "@/trpc/client";

/** Kept beside the header row it counts: `EmptyRow` has to span the table. */
const COLUMN_COUNT = 8;

/**
 * Typed as a key of the list input, so a typo stops compiling instead of
 * silently paginating nothing (`docs/DATA-FLOW.md`). ADR-0005 gives admin
 * routes English parameters, so this is the schema's field name unchanged.
 */
const PAGE_PARAM: keyof ProductListInput = "page";

const STATUS_BADGE_CLASSES: Record<ProductStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active:
    "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  archived:
    "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
};

/**
 * The catalog, one page at a time. The table owns its columns — a column spec
 * would need a `cell` function, which cannot cross the RSC boundary, so this
 * is markup the module writes itself (ADR-0016).
 *
 * `input` is a prop rather than something read back off the URL: the page
 * parsed it once and prefetched with it, and re-deriving it here is how a
 * client builds a query key that misses the hydrated one (ADR-0011).
 */
export function ProductTable({ input }: { input: ProductListInput }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.products.admin.list.queryOptions(input),
  );

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortHref = (field: ProductSortField) =>
    buildSortHref({
      pathname,
      searchParams,
      field,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      defaults: PRODUCT_SORT_DEFAULTS,
    });

  return (
    <div className="flex flex-col gap-4">
      <TableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortHeader
                href={sortHref("name")}
                active={input.sortBy === "name"}
                order={input.sortOrder}>
                Produto
              </SortHeader>
              <TableHead>Status</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Variantes</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <SortHeader
                href={sortHref("ratingAverage")}
                active={input.sortBy === "ratingAverage"}
                order={input.sortOrder}>
                Avaliação
              </SortHeader>
              <SortHeader
                href={sortHref("createdAt")}
                active={input.sortBy === "createdAt"}
                order={input.sortOrder}>
                Criado em
              </SortHeader>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.items.length === 0 ? (
              <EmptyRow colSpan={COLUMN_COUNT}>
                <p className="font-medium">Nenhum produto encontrado.</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Nada corresponde à busca, aos filtros ou à página atuais.
                </p>
                {/* A page past the end of the list leaves `PaginationNav` with
                    nothing to render, so the way back is here. */}
                {input.page > 1 && (
                  <Link
                    href={buildPageHref({
                      pathname,
                      searchParams,
                      key: PAGE_PARAM,
                      page: 1,
                    })}
                    className="mt-3 inline-block text-sm underline">
                    Voltar para a primeira página
                  </Link>
                )}
              </EmptyRow>
            ) : (
              data.items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-medium hover:underline">
                      {product.name}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      /{product.slug}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_BADGE_CLASSES[product.status],
                      )}>
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </span>
                  </TableCell>
                  <TableCell>{product.brandName}</TableCell>
                  <TableCell>{product.categoryName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.variantCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.totalStock}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatRating(product.ratingAverage)}
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({product.ratingCount})
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(product.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      <PaginationNav
        pathname={pathname}
        searchParams={searchParams}
        paramKey={PAGE_PARAM}
        page={input.page}
        totalPages={Math.ceil(data.total / PRODUCTS_PER_PAGE)}
      />
    </div>
  );
}
