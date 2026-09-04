import { describe, expect, test } from "bun:test";
import { PRODUCT_STATUSES } from "@/modules/products/constants";
import {
  isArchivable,
  isPublishable,
  isPublishableStatus,
} from "@/modules/products/status";

/**
 * The transition rule, from each of the three statuses and on both sides of
 * the image count. The table is written out rather than derived, so a change
 * to the rule has to change this file: a test that recomputed the predicate
 * would agree with any rule at all.
 */
describe("isPublishableStatus", () => {
  test("admits draft and archived", () => {
    expect(isPublishableStatus("draft")).toBe(true);
    expect(isPublishableStatus("archived")).toBe(true);
  });

  test("refuses a Product that is already active", () => {
    expect(isPublishableStatus("active")).toBe(false);
  });
});

describe("isPublishable", () => {
  test("moves draft and archived to active once a photograph exists", () => {
    expect(isPublishable("draft", 1)).toBe(true);
    expect(isPublishable("draft", 4)).toBe(true);
    expect(isPublishable("archived", 1)).toBe(true);
    expect(isPublishable("archived", 4)).toBe(true);
  });

  test("refuses a Product with no photographs", () => {
    expect(isPublishable("draft", 0)).toBe(false);
    expect(isPublishable("archived", 0)).toBe(false);
  });

  test("refuses a Product that is already active, photographs or not", () => {
    expect(isPublishable("active", 0)).toBe(false);
    expect(isPublishable("active", 1)).toBe(false);
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
   * The claim neither rule makes alone, and the reason the row actions can
   * render from `status` without a fallback: no status is a dead end — *for a
   * Product that has been photographed*. This one is derived rather than
   * written out, because it is a property *over* the three statuses rather
   * than a fact about any one of them.
   */
  test("every status admits at least one transition, given a photograph", () => {
    for (const status of PRODUCT_STATUSES) {
      expect(isPublishable(status, 1) || isArchivable(status)).toBe(true);
    }
  });

  /**
   * The corner the image rule opens, written out because it is the whole
   * point of the rule rather than an accident of it: an archived Product with
   * no photographs admits neither act. It stays archived and intact, which is
   * what the rule promises for Products archived before it existed. `draft`
   * and `active` still archive, so this is the only such status.
   */
  test("an archived Product with no photographs is a dead end", () => {
    expect(isPublishable("archived", 0)).toBe(false);
    expect(isArchivable("archived")).toBe(false);

    expect(isArchivable("draft")).toBe(true);
    expect(isArchivable("active")).toBe(true);
  });
});
