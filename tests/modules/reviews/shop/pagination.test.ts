import { describe, expect, test } from "bun:test";
import { toReviewPage } from "@/modules/reviews/shop/pagination";

const rows = Array.from({ length: 6 }, (_, index) => ({
  id: `review-${6 - index}`,
  createdAt: new Date(`2026-09-${String(12 - index).padStart(2, "0")}T12:00:00Z`),
  body: `Review ${6 - index}`,
}));

describe("toReviewPage", () => {
  test("returns five rows and continues after the last visible row", () => {
    expect(toReviewPage(rows)).toEqual({
      items: rows.slice(0, 5),
      nextCursor: {
        createdAt: rows[4]!.createdAt,
        id: rows[4]!.id,
      },
    });
  });

  test("returns no cursor when there is no older row", () => {
    expect(toReviewPage(rows.slice(0, 5))).toEqual({
      items: rows.slice(0, 5),
      nextCursor: null,
    });
  });
});
