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
 * The first paint of `ProductTable`, and only the first: once a table is on
 * screen a filter change dims it rather than coming back here
 * (`docs/DATA-FLOW.md`).
 *
 * A sibling file rather than a second export, because the page importing it is
 * a server component and the table it stands in for is not — and because
 * knowing this table's column count and widths is exactly what keeps it out of
 * the global layer.
 */

const COLUMNS = [
  { header: "Produto", bar: "w-40" },
  { header: "Status", bar: "w-16" },
  { header: "Marca", bar: "w-24" },
  { header: "Categoria", bar: "w-24" },
  { header: "Variantes", bar: "w-8 ml-auto" },
  { header: "Estoque", bar: "w-10 ml-auto" },
  { header: "Avaliação", bar: "w-12" },
  { header: "Criado em", bar: "w-20" },
];

const ROWS = 8;

export function ProductTableSkeleton() {
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
