import { describe, expect, test } from "bun:test";
import { PRODUCT_STATUSES } from "@/modules/products/constants";
import { isArchivable, isPublishable } from "@/modules/products/status";

/**
 * The transition rule, from each of the three statuses. The table is written
 * out rather than derived, so a change to the rule has to change this file:
 * a test that recomputed the predicate would agree with any rule at all.
 */
describe("isPublishable", () => {
  test("moves draft and archived to active", () => {
    expect(isPublishable("draft")).toBe(true);
    expect(isPublishable("archived")).toBe(true);
  });

  test("refuses a Product that is already active", () => {
    expect(isPublishable("active")).toBe(false);
  });
});

describe("isArchivable", () => {
  test("moves draft and active to archived", () => {
    expect(isArchivable("draft")).toBe(true);
    expect(isArchivable("active")).toBe(true);
  });

  test("refuses a Product that is already archived", () => {
    expect(isArchivable("archived")).toBe(false);
  });
});

describe("the two rules together", () => {
  /**
   * The one claim neither rule makes alone, and the reason the row actions can
   * render from `status` without a fallback: no status is a dead end. This one
   * is derived rather than written out, because it is a property *over* the
   * three statuses rather than a fact about any one of them.
   */
  test("every status admits at least one transition", () => {
    for (const status of PRODUCT_STATUSES) {
      expect(isPublishable(status) || isArchivable(status)).toBe(true);
    }
  });
});
