import { describe, expect, test } from "bun:test";
import {
  BEST_SELLER_ORDER_STATUSES,
  countsTowardBestSellers,
} from "@/modules/orders/status";

/**
 * Which of an Order's six statuses make its Items a sale (ADR-0047). The table
 * is written out rather than derived from the tuple, so a change to the rule
 * has to change this file.
 */
describe("countsTowardBestSellers", () => {
  test("counts an Order once payment has cleared, through delivery", () => {
    expect(countsTowardBestSellers("paid")).toBe(true);
    expect(countsTowardBestSellers("processing")).toBe(true);
    expect(countsTowardBestSellers("shipped")).toBe(true);
    expect(countsTowardBestSellers("delivered")).toBe(true);
  });

  test("does not count an Order still waiting on payment", () => {
    expect(countsTowardBestSellers("pending_payment")).toBe(false);
  });

  test("does not count a cancelled Order, whatever it reached before", () => {
    expect(countsTowardBestSellers("cancelled")).toBe(false);
  });
});

describe("BEST_SELLER_ORDER_STATUSES", () => {
  /**
   * The SQL relation reads the tuple and a transition reads the predicate, so
   * the two must name one set — this is the claim that keeps the ranking and
   * its invalidation from disagreeing.
   */
  test("is exactly the set the predicate admits", () => {
    expect([...BEST_SELLER_ORDER_STATUSES].sort()).toEqual([
      "delivered",
      "paid",
      "processing",
      "shipped",
    ]);

    for (const status of BEST_SELLER_ORDER_STATUSES) {
      expect(countsTowardBestSellers(status)).toBe(true);
    }
  });
});
