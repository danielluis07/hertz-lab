import { describe, expect, test } from "bun:test";
import { reviewWritingState } from "@/modules/reviews/shop/writing-state";

describe("reviewWritingState", () => {
  test("lets persisted moderation status win over delivered-order eligibility", () => {
    expect(
      reviewWritingState({
        existingStatus: "rejected",
        hasDeliveredOrder: true,
      }),
    ).toBe("rejected");
    expect(
      reviewWritingState({
        existingStatus: "approved",
        hasDeliveredOrder: false,
      }),
    ).toBe("approved");
  });

  test("uses delivered-order eligibility when no Review exists", () => {
    expect(
      reviewWritingState({
        existingStatus: undefined,
        hasDeliveredOrder: true,
      }),
    ).toBe("eligible");
    expect(
      reviewWritingState({
        existingStatus: undefined,
        hasDeliveredOrder: false,
      }),
    ).toBe("ineligible");
  });
});
