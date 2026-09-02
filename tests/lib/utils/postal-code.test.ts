import { describe, expect, test } from "bun:test";
import {
  formatPostalCode,
  isValidPostalCode,
  postalCodeSchema,
} from "@/lib/utils/postal-code";

describe("isValidPostalCode", () => {
  test("accepts eight digits, punctuated or not", () => {
    expect(isValidPostalCode("01310100")).toBe(true);
    expect(isValidPostalCode("01310-100")).toBe(true);
  });

  test("rejects any other length", () => {
    expect(isValidPostalCode("0131010")).toBe(false);
    expect(isValidPostalCode("013101000")).toBe(false);
    expect(isValidPostalCode("")).toBe(false);
  });
});

describe("formatPostalCode", () => {
  test("inserts the hyphen", () => {
    expect(formatPostalCode("01310100")).toBe("01310-100");
  });

  test("keeps a leading zero", () => {
    expect(formatPostalCode("01001000")).toBe("01001-000");
  });

  test("leaves a half-typed value alone", () => {
    expect(formatPostalCode("013")).toBe("013");
  });
});

describe("postalCodeSchema", () => {
  test("parses to digits only", () => {
    expect(postalCodeSchema.parse("01310-100")).toBe("01310100");
  });

  test("rejects an invalid CEP", () => {
    expect(postalCodeSchema.safeParse("123").success).toBe(false);
  });
});
