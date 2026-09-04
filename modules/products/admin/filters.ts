import type { FilterSpec } from "@/components/filter-bar";
import type { ProductListInput } from "@/modules/products/admin/schemas";
import { PRODUCT_STATUS_OPTIONS } from "@/modules/products/constants";
import type { RouterOutput } from "@/trpc/routers/_app";

/**
 * The products list's `FilterBar` spec: what an Admin can narrow the catalog
 * by, and the pt-BR copy for each control. ADR-0016 shares the bar and keeps
 * the declaration here, typed against the list input — a filter naming a
 * parameter `productListParamsSchema` does not declare fails to compile.
 *
 * It is a **function**, where `docs/DATA-FLOW.md` sketched a constant, because
 * two of the four filters are rows: Brand and Category options are read per
 * request by the composing route (ADR-0008's rule 4) and cannot be frozen into
 * a module constant. Taking them as an argument is also what keeps the mapping
 * from `{ id, name }` to `{ value, label }` out of `page.tsx`, which composes
 * and nothing more.
 */
export function productFilters({
  brands,
  categories,
}: {
  brands: RouterOutput["brands"]["admin"]["options"];
  categories: RouterOutput["categories"]["admin"]["options"];
}): readonly FilterSpec<ProductListInput>[] {
  return [
    {
      kind: "search",
      key: "search",
      // What the Portuguese tsvector actually covers, so the box does not
      // promise a SKU search the index cannot serve.
      placeholder: "Buscar por nome ou descrição...",
    },
    {
      kind: "select",
      key: "status",
      label: "Status",
      allLabel: "Todos os status",
      options: PRODUCT_STATUS_OPTIONS,
    },
    {
      kind: "select",
      key: "brandId",
      label: "Marca",
      allLabel: "Todas as marcas",
      options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    },
    {
      kind: "select",
      key: "categoryId",
      label: "Categoria",
      allLabel: "Todas as categorias",
      options: categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    },
  ];
}
