import type { ProductPage } from "@/modules/products/shop/types";

/**
 * The technical sheet, in the Admin's order: labels in sans, values in mono,
 * because a value is what a shopper compares character by character
 * (DESIGN.md). Treated as a feature, not fine print — a full section with
 * hairline rows, never a collapsed accordion.
 *
 * The page omits the section when there are no rows.
 */
export function ProductSpecifications({
  specifications,
}: {
  specifications: ProductPage["specifications"];
}) {
  return (
    <dl className="grid md:grid-cols-2 md:gap-x-12">
      {specifications.map((specification) => (
        <div
          key={specification.id}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-b py-3">
          <dt className="text-muted-foreground text-sm">
            {specification.label}
          </dt>
          <dd className="font-mono text-sm break-words">
            {specification.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
