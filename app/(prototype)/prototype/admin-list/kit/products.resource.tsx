"use client";

/**
 * PROTOTYPE — shape (a), the hard surface.
 *
 * The same kit, applied to the surface that actually breaks the mould. Read
 * this next to `brands.resource.tsx`: the config is no longer a declaration,
 * it is a component file with the JSX pushed inside array literals.
 */

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/date";
import { defineResource } from "./resource";
import { ResourceList } from "./resource-list";
import {
  PRODUCTS_PER_PAGE,
  PRODUCT_STATUS_OPTIONS,
  SORT_DEFAULTS,
  type ProductListInput,
} from "../params";
import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  type ProductRow,
} from "../fixtures";

// Three product rules, inlined here only because the prototype has no
// `modules/` to import from. In real code both shapes import them from
// `modules/products/status.ts` and `modules/products/rating.ts` — the config
// can import exactly as well as the markup can. This is *not* a difference
// between the shapes, and it is written down so it is not mistaken for one.
const STATUS_LABEL: Record<ProductRow["status"], string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

const STATUS_VARIANT: Record<
  ProductRow["status"],
  "secondary" | "default" | "outline"
> = { draft: "secondary", active: "default", archived: "outline" };

/** Hundredths to pt-BR: `450` -> `"4,50"`. */
const formatRating = (hundredths: number) =>
  (hundredths / 100).toFixed(2).replace(".", ",");

const productsResource = defineResource<ProductRow, ProductListInput>({
  title: "Produtos",
  createHref: "/admin/products/new",
  createLabel: "Novo produto",
  perPage: PRODUCTS_PER_PAGE,
  emptyMessage: "Nenhum produto encontrado.",
  sortDefaults: SORT_DEFAULTS.products,
  rowKey: (product) => product.id,
  rowHref: (product) => `/admin/products/${product.id}`,
  filters: [
    { kind: "search", placeholder: "Buscar produtos..." },
    {
      kind: "select",
      key: "status",
      label: "Status",
      options: PRODUCT_STATUS_OPTIONS,
    },
    {
      kind: "select",
      key: "categoryId",
      label: "Categoria",
      options: CATEGORY_OPTIONS,
    },
    { kind: "select", key: "brandId", label: "Marca", options: BRAND_OPTIONS },
  ],
  columns: [
    // The thumbnail wants to be the first column. It cannot be: the engine
    // wraps column 0 in the row link, and this cell would then be a link
    // containing the product name's link target with no text. So the name goes
    // first and the thumbnail second — a layout decided by the engine's
    // convention rather than by the surface.
    {
      header: "Nome",
      sortKey: "name",
      cell: (product) => product.name,
    },
    {
      header: "Imagem",
      cell: (product) =>
        product.thumbnailS3Key ? (
          <span className="inline-block size-8 rounded bg-muted" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { header: "Marca", cell: (product) => product.brandName },
    { header: "Categoria", cell: (product) => product.categoryName },
    {
      header: "Status",
      cell: (product) => (
        <Badge variant={STATUS_VARIANT[product.status]}>
          {STATUS_LABEL[product.status]}
        </Badge>
      ),
    },
    {
      header: "Avaliação",
      sortKey: "ratingAverage",
      align: "end",
      cell: (product) =>
        product.ratingCount === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span>
            {formatRating(product.ratingAverage)}{" "}
            <span className="text-muted-foreground">
              ({product.ratingCount})
            </span>
          </span>
        ),
    },
    {
      header: "Variantes",
      align: "end",
      cell: (product) => product.variantCount,
    },
    {
      header: "Criado em",
      sortKey: "createdAt",
      align: "end",
      cell: (product) => formatDate(product.createdAt),
    },
  ],
});

export function KitProductsList(props: {
  rows: ProductRow[];
  total: number;
  input: ProductListInput;
}) {
  return <ResourceList resource={productsResource} {...props} />;
}
