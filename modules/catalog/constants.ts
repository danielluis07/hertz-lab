/**
 * The storefront's URL vocabulary. ADR-0005: query parameters follow the
 * segment they hang off, so public routes speak Portuguese. These strings live
 * here, next to the code that uses them, rather than in a global map — which
 * word a route uses is a rule about that route, not a shape.
 */
export const SHOP_PARAMS = {
  search: "busca",
  page: "pagina",
  brand: "marca",
  sort: "ordenar",
} as const;
