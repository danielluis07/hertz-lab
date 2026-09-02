import { describe, expect, test } from "bun:test";
import { formatPhone, isValidPhone, phoneSchema } from "@/lib/utils/phone";

describe("isValidPhone", () => {
  test("accepts a mobile and a landline with an area code", () => {
    expect(isValidPhone("11987654321")).toBe(true);
    expect(isValidPhone("1134567890")).toBe(true);
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
  });

  test("rejects an area code below 11", () => {
    expect(isValidPhone("01987654321")).toBe(false);
    expect(isValidPhone("1034567890")).toBe(false);
  });

  test("rejects an 11-digit number that is not a mobile", () => {
    expect(isValidPhone("11387654321")).toBe(false);
  });

  test("rejects the wrong length", () => {
    expect(isValidPhone("123456789")).toBe(false);
    expect(isValidPhone("119876543210")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});

describe("formatPhone", () => {
  test("punctuates by length", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
  });

  test("leaves a half-typed value alone", () => {
    expect(formatPhone("119")).toBe("119");
  });
});

describe("phoneSchema", () => {
  test("parses to digits only", () => {
    expect(phoneSchema.parse("(11) 98765-4321")).toBe("11987654321");
  });

  test("rejects an invalid number", () => {
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });
});
