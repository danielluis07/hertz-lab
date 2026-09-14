import { describe, expect, test } from "bun:test";
import { PRODUCT_STATUSES } from "@/modules/products/constants";
import {
  isArchivable,
  isOnSale,
  isPhotographable,
  isPublishable,
  isPublishableStatus,
  uncoveredVariantIds,
  type GalleryCoverage,
} from "@/modules/products/status";

/**
 * The transition rule, from each of the three statuses and across the shapes a
 * Gallery can take. The tables are written out rather than derived, so a
 * change to the rule has to change this file: a test that recomputed the
 * predicate would agree with any rule at all.
 */

/** One Product-level Image, covering both Variants at once. */
const productLevel: GalleryCoverage = {
  variantIds: ["preto", "branco"],
  imageVariantIds: [null],
};

/** Each Variant photographed on its own. */
const everyVariant: GalleryCoverage = {
  variantIds: ["preto", "branco"],
  imageVariantIds: ["preto", "branco", "branco"],
};

/** `branco` and `azul` have nothing that applies to them. */
const uncovered: GalleryCoverage = {
  variantIds: ["preto", "branco", "azul"],
  imageVariantIds: ["preto", "preto"],
};

const imageless: GalleryCoverage = {
  variantIds: ["preto"],
  imageVariantIds: [],
};

describe("uncoveredVariantIds", () => {
  test("is empty when a Product-level Image covers every Variant", () => {
    expect(uncoveredVariantIds(productLevel)).toEqual([]);
  });

  test("a Product-level Image covers Variants that also have none of their own", () => {
    expect(
      uncoveredVariantIds({
        variantIds: ["preto", "branco"],
        imageVariantIds: ["preto", null],
      }),
    ).toEqual([]);
  });

  test("is empty when every Variant has an Image of its own", () => {
    expect(uncoveredVariantIds(everyVariant)).toEqual([]);
  });

  test("names each Variant with no applicable Image, in Variant order", () => {
    expect(uncoveredVariantIds(uncovered)).toEqual(["branco", "azul"]);
  });

  test("names a single uncovered Variant", () => {
    expect(
      uncoveredVariantIds({
        variantIds: ["preto", "branco"],
        imageVariantIds: ["preto"],
      }),
    ).toEqual(["branco"]);
  });

  test("names every Variant when there are no Images", () => {
    expect(uncoveredVariantIds(imageless)).toEqual(["preto"]);
  });

  test("an Image of another Variant id covers nothing it does not name", () => {
    expect(
      uncoveredVariantIds({
        variantIds: ["preto"],
        imageVariantIds: ["removida"],
      }),
    ).toEqual(["preto"]);
  });
});

describe("isPhotographable", () => {
  test("admits Product-level coverage and per-Variant coverage", () => {
    expect(isPhotographable(productLevel)).toBe(true);
    expect(isPhotographable(everyVariant)).toBe(true);
  });

  test("refuses one or more uncovered Variants", () => {
    expect(isPhotographable(uncovered)).toBe(false);
  });

  test("refuses no Images at all, even with no Variants to cover", () => {
    expect(isPhotographable(imageless)).toBe(false);
    expect(isPhotographable({ variantIds: [], imageVariantIds: [] })).toBe(
      false,
    );
  });
});

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
  test("moves draft and archived to active when every Variant is photographed", () => {
    expect(isPublishable("draft", productLevel)).toBe(true);
    expect(isPublishable("draft", everyVariant)).toBe(true);
    expect(isPublishable("archived", productLevel)).toBe(true);
    expect(isPublishable("archived", everyVariant)).toBe(true);
  });

  test("refuses a Product leaving any Variant without an applicable Image", () => {
    expect(isPublishable("draft", uncovered)).toBe(false);
    expect(isPublishable("archived", uncovered)).toBe(false);
  });

  test("refuses a Product with no photographs", () => {
    expect(isPublishable("draft", imageless)).toBe(false);
    expect(isPublishable("archived", imageless)).toBe(false);
  });

  test("refuses a Product that is already active, whatever its Gallery", () => {
    expect(isPublishable("active", productLevel)).toBe(false);
    expect(isPublishable("active", everyVariant)).toBe(false);
    expect(isPublishable("active", uncovered)).toBe(false);
    expect(isPublishable("active", imageless)).toBe(false);
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
   * Product photographed for every Variant*. Derived rather than written out,
   * because it is a property *over* the three statuses rather than a fact
   * about any one of them.
   */
  test("every status admits at least one transition, given full coverage", () => {
    for (const status of PRODUCT_STATUSES) {
      expect(isPublishable(status, productLevel) || isArchivable(status)).toBe(
        true,
      );
    }
  });

  /**
   * The corner the photograph rule opens, written out because it is the whole
   * point of the rule rather than an accident of it: an archived Product with
   * an uncovered Variant admits neither act. It stays archived and intact
   * until it is photographed. `draft` and `active` still archive, so this is
   * the only such status.
   */
  test("an archived Product with an uncovered Variant is a dead end", () => {
    expect(isPublishable("archived", uncovered)).toBe(false);
    expect(isArchivable("archived")).toBe(false);

    expect(isArchivable("draft")).toBe(true);
    expect(isArchivable("active")).toBe(true);
  });
});

/**
 * Only an active Product is on sale (`CONTEXT.md`) — the pure twin of the
 * shop's `visibleProduct` clause, which a Cart line reads to explain why it
 * cannot be bought.
 */
describe("isOnSale", () => {
  test("admits only active", () => {
    expect(isOnSale("active")).toBe(true);
    expect(isOnSale("draft")).toBe(false);
    expect(isOnSale("archived")).toBe(false);
  });
});
