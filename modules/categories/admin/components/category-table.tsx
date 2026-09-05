"use client";

import Link from "next/link";
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
import { s3KeyToUrl } from "@/lib/utils/url";
import type { CategoryListInput } from "@/modules/categories/admin/schemas";
import {
  CATEGORY_SORT_DEFAULTS,
  type CategorySortField,
} from "@/modules/categories/constants";
import { useTRPC } from "@/trpc/client";

/** Kept beside the header row it counts: `EmptyRow` has to span the table. */
const COLUMN_COUNT = 7;

/**
 * What an Admin reads where a Category has no parent. A blank cell says
 * "unknown" — this says "root", which is a fact about the row.
 */
const NO_PARENT = "—";

/**
 * Every Category on one page. The table owns its columns — a column spec would
 * need a `cell` function, which cannot cross the RSC boundary, so this is
 * markup the module writes itself (ADR-0016).
 *
 * **There is no `FilterBar`, no search box and no `PaginationNav`**, and their
 * absence is a decision rather than an omission (#56): a control that narrows a
 * list already visible in full is decoration. What survives is the sort, because
 * a sorted list is still a URL.
 *
 * `input` is a prop rather than something read back off the URL: the page
 * parsed it once and prefetched with it, and re-deriving it here is how a
 * client builds a query key that misses the hydrated one (ADR-0011). The rows
 * themselves never cross as props — this reads the same query the page primed.
 */
export function CategoryTable({ input }: { input: CategoryListInput }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.categories.admin.list.queryOptions(input),
  );

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortHref = (field: CategorySortField) =>
    buildSortHref({
      pathname,
      searchParams,
      field,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      defaults: CATEGORY_SORT_DEFAULTS,
    });

  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* The picture has no header text: "Imagem" above a column of
                thumbnails names what is plainly visible. The width is fixed so
                the column does not collapse while every Category is still
                pictureless. */}
            <TableHead className="w-16">
              <span className="sr-only">Imagem</span>
            </TableHead>
            <SortHeader
              href={sortHref("name")}
              active={input.sortBy === "name"}
              order={input.sortOrder}>
              Nome
            </SortHeader>
            <TableHead>Slug</TableHead>
            <SortHeader
              href={sortHref("parentName")}
              active={input.sortBy === "parentName"}
              order={input.sortOrder}>
              Categoria pai
            </SortHeader>
            <SortHeader
              href={sortHref("productCount")}
              active={input.sortBy === "productCount"}
              order={input.sortOrder}>
              Nº de produtos
            </SortHeader>
            {/* Not sortable, and the asymmetry is deliberate: the question the
                Product count answers is "which sections are overloaded", and
                there is no matching question about how many children a
                two-level tree hangs under a root (ADR-0022). */}
            <TableHead className="text-right">Nº de subcategorias</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <EmptyRow colSpan={COLUMN_COUNT}>
              <p className="font-medium">Nenhuma categoria cadastrada.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {/* No "clear the filters" line, because there are no filters:
                    an empty table here means the table is empty. */}
                Crie a primeira categoria para organizar o catálogo.
              </p>
            </EmptyRow>
          ) : (
            data.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  {category.imageS3Key ? (
                    <>
                      {/* A plain `img`, for `ImageTile`'s reason: a bucket
                          object at thumbnail size on a page only an Admin
                          opens is not a job for the optimizer. `alt=""`
                          because the Category name is in the cell beside it. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s3KeyToUrl(category.imageS3Key)}
                        alt=""
                        className="bg-muted size-10 rounded-md border object-cover"
                      />
                    </>
                  ) : (
                    // Every Category is pictureless until the form can upload
                    // one, so this is what the column shows for now: the box a
                    // thumbnail will occupy, and nothing in it.
                    <div className="bg-muted size-10 rounded-md border" />
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/categories/${category.id}`}
                    className="font-medium hover:underline">
                    {category.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  /{category.slug}
                </TableCell>
                <TableCell>
                  {category.parentName ?? (
                    <span className="text-muted-foreground">{NO_PARENT}</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {category.productCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {category.childCount}
                </TableCell>
                {/* The slot the delete action lands in (#63). Empty rather
                    than absent, so adding it changes one cell and not the
                    column count, the header row and the skeleton beside it. */}
                <TableCell className="text-right" />
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableShell>
  );
}
