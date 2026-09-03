/**
 * PROTOTYPE — shape (b), the easy surface.
 *
 * A **server component**. The only JavaScript this list ships is the filter
 * island; the header row, every cell and the pagination are HTML.
 */

import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils/date";
import type { BrandRow } from "../fixtures";
import { BRANDS_PER_PAGE, SORT_DEFAULTS, type BrandListInput } from "../params";
import { buildSortHref } from "../sort";
import { BrandListFilters } from "./brand-list-filters";
import { EmptyRow, SortHeader, TableShell } from "./data-table";

export function PrimitivesBrandsList({
  rows,
  total,
  input,
  pathname,
  searchParams,
}: {
  rows: BrandRow[];
  total: number;
  input: BrandListInput;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const sortHref = (field: BrandListInput["sortBy"]) =>
    buildSortHref({
      pathname,
      searchParams,
      field,
      currentField: input.sortBy,
      currentOrder: input.sortOrder,
      defaultDirection: SORT_DEFAULTS.brands[field],
    });

  const headerProps = (field: BrandListInput["sortBy"]) => ({
    href: sortHref(field),
    isActive: field === input.sortBy,
    order: input.sortOrder,
  });

  return (
    <div className="group flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Marcas</h1>
        <Button render={<Link href="/admin/brands/new" />}>Nova marca</Button>
      </div>

      <BrandListFilters />

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Nome" {...headerProps("name")} />
              <TableHead>Slug</TableHead>
              <SortHeader
                label="Produtos"
                align="end"
                {...headerProps("productCount")}
              />
              <SortHeader
                label="Criada em"
                align="end"
                {...headerProps("createdAt")}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={4}>Nenhuma marca encontrada.</EmptyRow>
            ) : (
              rows.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <Link
                      href={`/admin/brands/${brand.id}`}
                      className="font-medium hover:underline">
                      {brand.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {brand.slug}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    {brand.productCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDate(brand.createdAt)}
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
        paramKey="page"
        page={input.page}
        totalPages={Math.ceil(total / BRANDS_PER_PAGE)}
      />
    </div>
  );
}
