/**
 * PROTOTYPE — shape (b), the hard surface.
 *
 * Still a server component, still one client island. The thumbnail sits first
 * because this surface wants it first; nothing had to permit that.
 */

import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
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
import type { ProductRow } from "../fixtures";
import {
  PRODUCTS_PER_PAGE,
  SORT_DEFAULTS,
  type ProductListInput,
} from "../params";
import { buildSortHref } from "../sort";
import { EmptyRow, SortHeader, TableShell } from "./data-table";
import { ProductListFilters } from "./product-list-filters";

// The same three rules as the kit config inlines. Same reason: no `modules/`
// folder — but in real code these are `modules/products/status.ts` and
// `modules/products/rating.ts`, which the shop side imports too — under either
// shape. Not a difference between them.
const STATUS_LABEL: Record<ProductRow["status"], string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

const STATUS_VARIANT: Record<
  ProductRow["status"],
  "secondary" | "default" | "outline"
> = { draft: "secondary", active: "default", archived: "outline" };

const formatRating = (hundredths: number) =>
  (hundredths / 100).toFixed(2).replace(".", ",");

export function PrimitivesProductsList({
  rows,
  total,
  input,
  pathname,
  searchParams,
}: {
  rows: ProductRow[];
  total: number;
  input: ProductListInput;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const headerProps = (field: ProductListInput["sortBy"]) => ({
    href: buildSortHref({
      pathname,
      searchParams,
      field,
      currentField: input.sortBy,
      currentOrder: input.sortOrder,
      defaultDirection: SORT_DEFAULTS.products[field],
    }),
    isActive: field === input.sortBy,
    order: input.sortOrder,
  });

  return (
    <div className="group flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produtos</h1>
        <Button render={<Link href="/admin/products/new" />}>
          Novo produto
        </Button>
      </div>

      <ProductListFilters input={input} />

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only">Imagem</span>
              </TableHead>
              <SortHeader label="Nome" {...headerProps("name")} />
              <TableHead>Marca</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <SortHeader
                label="Avaliação"
                align="end"
                {...headerProps("ratingAverage")}
              />
              <TableHead className="text-right">Variantes</TableHead>
              <SortHeader
                label="Criado em"
                align="end"
                {...headerProps("createdAt")}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={8}>Nenhum produto encontrado.</EmptyRow>
            ) : (
              rows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.thumbnailS3Key ? (
                      <span className="inline-block size-8 rounded bg-muted" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-medium hover:underline">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>{product.brandName}</TableCell>
                  <TableCell>{product.categoryName}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[product.status]}>
                      {STATUS_LABEL[product.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {product.ratingCount === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        {formatRating(product.ratingAverage)}{" "}
                        <span className="text-muted-foreground">
                          ({product.ratingCount})
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.variantCount}
                  </TableCell>
                  <TableCell className="text-right">
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
        paramKey="page"
        page={input.page}
        totalPages={Math.ceil(total / PRODUCTS_PER_PAGE)}
      />
    </div>
  );
}
