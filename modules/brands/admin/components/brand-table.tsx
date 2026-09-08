"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EmptyRow, SortHeader, TableShell } from "@/components/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildSortHref } from "@/lib/utils/sort";
import { BrandRowActions } from "@/modules/brands/admin/components/brand-row-actions";
import type { BrandListInput } from "@/modules/brands/admin/schemas";
import {
  BRAND_SORT_DEFAULTS,
  type BrandSortField,
} from "@/modules/brands/constants";
import { useTRPC } from "@/trpc/client";

/** Kept beside the header row it counts: `EmptyRow` has to span the table. */
const COLUMN_COUNT = 3;

/**
 * Every Brand on one page. The table owns its columns — a column spec would
 * need a `cell` function, which cannot cross the RSC boundary, so this is
 * markup the module writes itself (ADR-0016), and no row array crosses as a
 * prop.
 *
 * **There is no `FilterBar`, no search box and no `PaginationNav`**, and their
 * absence is a decision rather than an omission (ADR-0025): a control that
 * narrows a list already visible in full is decoration. What survives is the
 * sort, because a sorted list is still a URL.
 *
 * `input` is a prop rather than something read back off the URL: the page
 * parsed it once and prefetched with it, and re-deriving it here is how a
 * client builds a query key that misses the hydrated one (ADR-0011). The rows
 * themselves never cross as props — this reads the same query the page primed,
 * through `useSuspenseQuery` (ADR-0016's amendment).
 *
 * **A Brand's name is not a link.** Categories and Products each have a route
 * to open, and a Brand does not: its form is a dialog mounted in the row
 * actions cell (ADR-0026), so the cell to the right is where a row is edited.
 */
export function BrandTable({ input }: { input: BrandListInput }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.brands.admin.list.queryOptions(input));

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortHref = (field: BrandSortField) =>
    buildSortHref({
      pathname,
      searchParams,
      field,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      defaults: BRAND_SORT_DEFAULTS,
    });

  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHeader
              href={sortHref("name")}
              active={input.sortBy === "name"}
              order={input.sortOrder}>
              Nome
            </SortHeader>
            <SortHeader
              href={sortHref("productCount")}
              active={input.sortBy === "productCount"}
              order={input.sortOrder}>
              Nº de produtos
            </SortHeader>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <EmptyRow colSpan={COLUMN_COUNT}>
              <p className="font-medium">Nenhuma marca cadastrada.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {/* No "clear the filters" line, because there are no filters:
                    an empty table here means the table is empty. */}
                Cadastre a primeira marca para começar o catálogo.
              </p>
            </EmptyRow>
          ) : (
            data.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {brand.productCount}
                </TableCell>
                <TableCell className="text-right">
                  {/* Two scalars, never the row: the actions cell is a leaf
                      client component and no row object is serialized into
                      the document (ADR-0016). What it mounts is this row's
                      own edit dialog, unmounted until the Admin opens it
                      (ADR-0026). */}
                  <BrandRowActions id={brand.id} name={brand.name} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableShell>
  );
}
