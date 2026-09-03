"use client";

/**
 * PROTOTYPE — shape (a), the easy surface.
 *
 * This is the whole brands list. It is what the kit is for.
 */

import { defineResource } from "./resource";
import { ResourceList } from "./resource-list";
import { formatDate } from "@/lib/utils/date";
import { BRANDS_PER_PAGE, SORT_DEFAULTS, type BrandListInput } from "../params";
import type { BrandRow } from "../fixtures";

const brandsResource = defineResource<BrandRow, BrandListInput>({
  title: "Marcas",
  createHref: "/admin/brands/new",
  createLabel: "Nova marca",
  perPage: BRANDS_PER_PAGE,
  emptyMessage: "Nenhuma marca encontrada.",
  sortDefaults: SORT_DEFAULTS.brands,
  rowKey: (brand) => brand.id,
  rowHref: (brand) => `/admin/brands/${brand.id}`,
  filters: [{ kind: "search", placeholder: "Buscar marcas..." }],
  columns: [
    { header: "Nome", sortKey: "name", cell: (brand) => brand.name },
    {
      header: "Slug",
      cell: (brand) => (
        <code className="text-xs text-muted-foreground">{brand.slug}</code>
      ),
    },
    {
      header: "Produtos",
      sortKey: "productCount",
      align: "end",
      cell: (brand) => brand.productCount,
    },
    {
      header: "Criada em",
      sortKey: "createdAt",
      align: "end",
      cell: (brand) => formatDate(brand.createdAt),
    },
  ],
});

export function KitBrandsList(props: {
  rows: BrandRow[];
  total: number;
  input: BrandListInput;
}) {
  return <ResourceList resource={brandsResource} {...props} />;
}
