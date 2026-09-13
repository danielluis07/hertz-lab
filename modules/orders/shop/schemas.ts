import { z } from "zod";
import { ORDER_LIST_PARAMS } from "@/modules/orders/shop/constants";

/**
 * The Order history's one lenient list schema. It parses a public URL and
 * re-validates the same normalized object as `orders.shop.list` input.
 */
export const orderListParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
});

export type OrderListInput = z.infer<typeof orderListParamsSchema>;

/** Maps the public Portuguese URL vocabulary to the procedure's English input. */
export function parseOrderListParams(
  searchParams: Record<string, string | string[] | undefined>,
): OrderListInput {
  return orderListParamsSchema.parse({
    page: searchParams[ORDER_LIST_PARAMS.page],
  });
}

/**
 * Returns the canonical query string for server-rendered history links. Page
 * one is the bare route; later pages use the public `pagina` key.
 */
export function toOrderListSearchParams(
  input: OrderListInput,
): URLSearchParams {
  const params = new URLSearchParams();

  if (input.page > 1) {
    params.set(ORDER_LIST_PARAMS.page, String(input.page));
  }

  return params;
}
