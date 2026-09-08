import { describe, expect, test } from "bun:test";
import {
  formatBasisPoints,
  formatBRL,
  formatRating,
  parseBRLInput,
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

describe("parseBRLInput", () => {
  test("round-trips what formatBRL produced", () => {
    for (const cents of [0, 99, 123456, 1234567890]) {
      expect(parseBRLInput(formatBRL(cents))).toBe(cents);
    }
  });

  test("fills the amount from the right, one keystroke at a time", () => {
    // What the box holds after each of "1", "2", "3", "0" — the value it sends
    // back, and the string formatBRL renders it as on the next keystroke.
    expect(parseBRLInput("R$ 0,001")).toBe(1);
    expect(parseBRLInput("R$ 0,012")).toBe(12);
    expect(parseBRLInput("R$ 0,123")).toBe(123);
    expect(parseBRLInput("R$ 1,230")).toBe(1230);
  });

  test("takes back a digit when one is deleted", () => {
    expect(parseBRLInput("R$ 12,3")).toBe(123);
    expect(parseBRLInput("R$ 1,2")).toBe(12);
  });

  test("keeps the digits of a pasted amount", () => {
    expect(parseBRLInput("R$ 1.234,56")).toBe(123456);
    expect(parseBRLInput("1.234,56")).toBe(123456);
    expect(parseBRLInput("1234,56")).toBe(123456);
  });

  test("distinguishes an emptied box from a zero", () => {
    expect(parseBRLInput("")).toBeNull();
    expect(parseBRLInput("   ")).toBeNull();
    expect(parseBRLInput("R$")).toBeNull();
    expect(parseBRLInput("0")).toBe(0);
  });

  test("stays inside the safe-integer range however long the input", () => {
    expect(Number.isSafeInteger(parseBRLInput("9".repeat(40)))).toBe(true);
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
