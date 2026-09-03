import { describe, expect, test } from "bun:test";
import {
  formatBasisPoints,
  formatBRL,
  formatRating,
  parseBRL,
} from "@/lib/utils/format";

// Intl uses a non-breaking space after "R$"; normalise so assertions read plainly.
const plain = (value: string) => value.replace(/ /g, " ");

describe("formatBRL", () => {
  test("formats cents in pt-BR notation", () => {
    expect(plain(formatBRL(123456))).toBe("R$ 1.234,56");
    expect(plain(formatBRL(99))).toBe("R$ 0,99");
    expect(plain(formatBRL(0))).toBe("R$ 0,00");
  });

  test("keeps the thousands separators of a large amount", () => {
    expect(plain(formatBRL(1234567890))).toBe("R$ 12.345.678,90");
  });
});

describe("formatBasisPoints", () => {
  test("reads basis points as a percentage", () => {
    expect(formatBasisPoints(1000)).toBe("10%");
    expect(formatBasisPoints(10000)).toBe("100%");
    expect(formatBasisPoints(50)).toBe("0,5%");
  });
});

describe("parseBRL", () => {
  test("round-trips what formatBRL produced", () => {
    for (const cents of [0, 99, 123456, 1234567890]) {
      expect(parseBRL(formatBRL(cents))).toBe(cents);
    }
  });

  test("accepts pt-BR notation with and without separators", () => {
    expect(parseBRL("1.234,56")).toBe(123456);
    expect(parseBRL("1234,56")).toBe(123456);
    expect(parseBRL("1234")).toBe(123400);
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
  });

  test("reads a lone trailing .dd as a decimal point", () => {
    expect(parseBRL("1234.56")).toBe(123456);
  });

  test("reads dots as thousands separators when they are not a lone .dd", () => {
    expect(parseBRL("1.234")).toBe(123400);
    expect(parseBRL("1.234.567")).toBe(123456700);
  });

  test("distinguishes empty from zero", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("   ")).toBeNull();
    expect(parseBRL("R$")).toBeNull();
    expect(parseBRL("0")).toBe(0);
  });

  test("rounds rather than truncating", () => {
    expect(parseBRL("0,005")).toBe(1);
  });
});

describe("formatRating", () => {
  test("reads hundredths as a one-decimal average", () => {
    expect(formatRating(450)).toBe("4,5");
    expect(formatRating(500)).toBe("5,0");
    expect(formatRating(0)).toBe("0,0");
  });

  test("rounds to the tenth an admin table has room for", () => {
    expect(formatRating(467)).toBe("4,7");
    expect(formatRating(425)).toBe("4,3");
  });
});
