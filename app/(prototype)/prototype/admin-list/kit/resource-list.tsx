"use client";

/**
 * PROTOTYPE — shape (a): the engine.
 *
 * One component renders every admin list. A module supplies a
 * `ResourceDefinition` and nothing else.
 *
 * It is a **client component**, and it has to be: it owns the filter state.
 * Because a `ResourceDefinition` carries render functions (`cell`, `rowHref`),
 * it cannot be passed from a server page as a prop — functions do not cross the
 * RSC boundary. So each surface's config file is itself `"use client"` and the
 * whole table renders in the browser.
 */

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildSortHref, sortIndicator } from "../sort";
import type { BaseListInput, ResourceDefinition } from "./resource";
import { useResourceFilters } from "./use-resource-filters";

export function ResourceList<TRow, TInput extends BaseListInput>({
  resource,
  rows,
  total,
  input,
}: {
  resource: ResourceDefinition<TRow, TInput>;
  rows: TRow[];
  total: number;
  input: TInput;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { optimisticInput, setFilter, search, isPending } =
    useResourceFilters(input);

  const totalPages = Math.ceil(total / resource.perPage);

  return (
    <div className="group flex flex-col gap-4" data-pending={isPending || undefined}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{resource.title}</h1>
        {resource.createHref && (
          <Button render={<Link href={resource.createHref} />}>
            {resource.createLabel}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {resource.filters.map((filter) =>
          filter.kind === "search" ? (
            <Input
              key="search"
              className="w-64"
              placeholder={filter.placeholder}
              value={search.value}
              onChange={(event) => search.setValue(event.target.value)}
            />
          ) : (
            <select
              key={filter.key}
              // Native on purpose: the control's chrome is not what is under
              // test, and `components/ui/select.tsx` would be identical in both
              // shapes.
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={
                (optimisticInput[filter.key as keyof TInput] as string) ?? ""
              }
              onChange={(event) =>
                setFilter(filter.key, event.target.value || undefined)
              }>
              <option value="">{filter.label}: todos</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ),
        )}
      </div>

      <div className="rounded-lg border transition-opacity group-has-data-pending:opacity-50">
        <Table>
          <TableHeader>
            <TableRow>
              {resource.columns.map((column) => (
                <TableHead
                  key={column.header}
                  className={column.align === "end" ? "text-right" : undefined}>
                  {column.sortKey ? (
                    <Link
                      href={buildSortHref({
                        pathname,
                        searchParams,
                        field: column.sortKey,
                        currentField: input.sortBy,
                        currentOrder: input.sortOrder,
                        defaultDirection: resource.sortDefaults[column.sortKey],
                      })}
                      className="hover:underline">
                      {column.header}
                      {sortIndicator(
                        column.sortKey === input.sortBy,
                        input.sortOrder,
                      )}
                    </Link>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={resource.columns.length}
                  className="h-24 text-center text-muted-foreground">
                  {resource.emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={resource.rowKey(row)}>
                  {resource.columns.map((column, index) => (
                    <TableCell
                      key={column.header}
                      className={
                        column.align === "end" ? "text-right" : undefined
                      }>
                      {/*
                        The engine decides which cell carries the row link, and
                        the config cannot say otherwise. "The first column" is a
                        convention invented here, not a fact about the domain.
                      */}
                      {index === 0 ? (
                        <Link
                          href={resource.rowHref(row)}
                          className="font-medium hover:underline">
                          {column.cell(row)}
                        </Link>
                      ) : (
                        column.cell(row)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationNav
        pathname={pathname}
        searchParams={new URLSearchParams(searchParams.toString())}
        paramKey="page"
        page={input.page}
        totalPages={totalPages}
      />
    </div>
  );
}
