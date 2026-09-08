import { TableShell } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * The first paint of `BrandTable`, and only the first. A sort is a `Link`, and
 * Next runs a link navigation in a transition, so the table already on screen
 * stays there while the next order is fetched rather than coming back here.
 * `page.tsx` has the rest of that note, including why this list has no
 * `data-pending` dimming to fall back on.
 *
 * A sibling file rather than a second export, because the page importing it is
 * a server component and the table it stands in for is not — and because
 * knowing this table's column count and widths is exactly what keeps it out of
 * the global layer.
 *
 * The columns are hardcoded rather than derived from the table beside it: a
 * shared array would be a rule two files obey, and the whole point of the
 * skeleton is that it renders before anything knows what a row contains.
 */

const COLUMNS = [
  { header: "Nome", head: undefined, bar: "w-32" },
  { header: "Nº de produtos", head: undefined, bar: "w-8 ml-auto" },
  // `head` carries the alignment its header has in the table, so the word
  // "Ações" does not slide from one edge of its cell to the other when the rows
  // arrive. No bar, though: the row-actions cell is empty until the dialog form
  // and the delete confirm land, and a placeholder here would promise a control
  // that is not going to appear.
  { header: "Ações", head: "text-right", bar: undefined },
];

/**
 * Eight, which is the shape of a list of tens of rows rather than its length.
 * A skeleton that guessed the real count would be a claim it cannot make
 * before the query returns.
 */
const ROWS = 8;

export function BrandTableSkeleton() {
  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((column) => (
              <TableHead key={column.header} className={column.head}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: ROWS }, (_, row) => (
            <TableRow key={row} className="hover:bg-transparent">
              {COLUMNS.map((column) => (
                <TableCell key={column.header}>
                  {column.bar ? (
                    <Skeleton className={cn("h-4", column.bar)} />
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableShell>
  );
}
