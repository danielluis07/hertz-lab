import { describe, expect, test } from "bun:test";
import {
  orderListParamsSchema,
  parseOrderListParams,
  toOrderListSearchParams,
  type OrderListInput,
} from "@/modules/orders/shop/schemas";

type RawParams = Record<string, string | string[] | undefined>;

const defaults: OrderListInput = { page: 1 };

describe("parseOrderListParams", () => {
  test("maps the public Portuguese parameter to the English input key", () => {
    expect(parseOrderListParams({ pagina: "3" })).toEqual({ page: 3 });
    expect(parseOrderListParams({ page: "3" })).toEqual(defaults);
  });

  test("turns missing or garbage pages into page one without throwing", () => {
    const cases: RawParams[] = [
      {},
      { pagina: "abc" },
      { pagina: "0" },
      { pagina: "-1" },
      { pagina: "2.5" },
      { pagina: ["2", "3"] },
    ];

    for (const params of cases) {
      expect(() => parseOrderListParams(params)).not.toThrow();
      expect(parseOrderListParams(params)).toEqual(defaults);
    }
  });

  test("strips unknown keys and leaves an out-of-range view unclamped", () => {
    const parsed = parseOrderListParams({ pagina: "999", filtro: "pago" });

    expect(parsed).toEqual({ page: 999 });
    expect(parsed).not.toHaveProperty("filtro");
  });
});

describe("orderListParamsSchema", () => {
  test("is idempotent so the parsed object is also procedure input", () => {
    for (const raw of [{}, { pagina: "2" }, { pagina: "abc" }]) {
      const once = parseOrderListParams(raw);

      expect(orderListParamsSchema.parse(once)).toEqual(once);
    }
  });
});

describe("toOrderListSearchParams", () => {
  test("omits page one and writes later pages with the public key", () => {
    expect(toOrderListSearchParams({ page: 1 }).toString()).toBe("");
    expect(toOrderListSearchParams({ page: 4 }).toString()).toBe("pagina=4");
  });

  test("round-trips canonical input through the public URL parser", () => {
    for (const input of [{ page: 1 }, { page: 2 }, { page: 999 }]) {
      const raw = Object.fromEntries(toOrderListSearchParams(input));

      expect(parseOrderListParams(raw)).toEqual(input);
    }
  });
});
