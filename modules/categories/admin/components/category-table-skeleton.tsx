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
 * The first paint of `CategoryTable`, and only the first: once a table is on
 * screen a sort change dims it rather than coming back here
 * (`docs/DATA-FLOW.md`).
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
  { header: "", bar: "size-10 rounded-md" },
  { header: "Nome", bar: "w-32" },
  { header: "Slug", bar: "w-24" },
  { header: "Categoria pai", bar: "w-24" },
  { header: "Nº de produtos", bar: "w-8 ml-auto" },
  { header: "Nº de subcategorias", bar: "w-8 ml-auto" },
  { header: "Ações", bar: "w-8 ml-auto" },
];

/**
 * Eight, which is the shape of a list of tens of rows rather than its length.
 * A skeleton that guessed the real count would be a claim it cannot make
 * before the query returns.
 */
const ROWS = 8;

export function CategoryTableSkeleton() {
  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((column) => (
              <TableHead key={column.header}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: ROWS }, (_, row) => (
            <TableRow key={row} className="hover:bg-transparent">
              {COLUMNS.map((column) => (
                <TableCell key={column.header}>
                  <Skeleton className={cn("h-4", column.bar)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableShell>
  );
}
