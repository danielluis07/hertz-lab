/**
 * PROTOTYPE — shape (b): the shared primitives.
 *
 * Deliberately **not** a client component and deliberately not generic. It has
 * no idea what a row is. A surface composes it and writes its own markup.
 *
 * `SortHeader` is an anchor, so a sortable header row ships no JavaScript —
 * the same argument `components/pagination-nav.tsx` already makes.
 */

import Link from "next/link";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { sortIndicator, type SortDirection } from "../sort";

export function SortHeader({
  href,
  label,
  isActive,
  order,
  align,
}: {
  href: string;
  label: string;
  isActive: boolean;
  order: SortDirection;
  align?: "end";
}) {
  return (
    <TableHead className={align === "end" ? "text-right" : undefined}>
      <Link href={href} className="hover:underline">
        {label}
        {sortIndicator(isActive, order)}
      </Link>
    </TableHead>
  );
}

export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

/** The shell: border, and the dim an ancestor's `data-pending` drives. */
export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border transition-opacity group-has-data-pending:opacity-50">
      {children}
    </div>
  );
}
