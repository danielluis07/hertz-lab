import type { OrderListInput } from "@/modules/orders/shop/schemas";

/** Orders shown per account-history page; the page size is never public input. */
export const ORDERS_PER_PAGE = 10;

/** Public URL names for the English list-input keys (ADR-0005). */
export const ORDER_LIST_PARAMS = {
  page: "pagina",
} as const satisfies Record<keyof OrderListInput, string>;
