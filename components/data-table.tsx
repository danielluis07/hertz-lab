import Link from "next/link";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/lib/utils/sort";

/**
 * The three pieces every admin list shares. None of them knows a column or a
 * row — that is the promotion gate they passed (ADR-0016): what a table sorts
 * by and what a cell renders need functions, and functions do not cross the
 * RSC boundary, so the table itself stays markup its module owns.
 */

/** The bordered frame around a list's table. */
export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card overflow-hidden rounded-lg border">{children}</div>
  );
}

/**
 * A sortable column header: an anchor, never a control. A sorted list is a
 * URL, so this needs no click handler and no state of its own, and a column
 * can be middle-clicked into a new tab. The href comes from `buildSortHref`,
 * which holds the toggle rule; this renders it.
 */
export function SortHeader({
  href,
  active,
  order,
  children,
}: {
  href: string;
  /** Whether the list is currently sorted by this column. */
  active: boolean;
  /** The direction the list is sorted in, when it is sorted by this column. */
  order: SortOrder;
  children: React.ReactNode;
}) {
  const Icon = !active
    ? ChevronsUpDownIcon
    : order === "asc"
      ? ChevronUpIcon
      : ChevronDownIcon;

  return (
    <TableHead
      aria-sort={
        active ? (order === "asc" ? "ascending" : "descending") : "none"
      }>
      <Link
        href={href}
        className="hover:text-foreground inline-flex items-center gap-1">
        {children}
        <Icon
          aria-hidden
          className={cn("size-3.5", active ? "opacity-100" : "opacity-40")}
        />
      </Link>
    </TableHead>
  );
}

/**
 * The row a table renders instead of rows. It exists so that "nothing matched"
 * is visibly different from "something broke" — the latter is
 * `app/(admin)/error.tsx`, and a blank table is neither.
 *
 * The explanation is the caller's: only the surface knows what an Admin was
 * looking for.
 */
export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="h-28 text-center align-middle whitespace-normal">
        {children}
      </TableCell>
    </TableRow>
  );
}
