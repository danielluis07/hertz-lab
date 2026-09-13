import { describe, expect, test } from "bun:test";
import { updateCustomerProfileSchema } from "@/modules/customers/schemas";

describe("updateCustomerProfileSchema", () => {
  test("normalizes a valid Brazilian phone number", () => {
    expect(
      updateCustomerProfileSchema.parse({
        phone: "(11) 98765-4321",
        birthDate: null,
      }),
    ).toEqual({ phone: "11987654321", birthDate: null });
  });

  test("rejects an invalid phone number", () => {
    expect(
      updateCustomerProfileSchema.safeParse({
        phone: "123",
        birthDate: null,
      }).success,
    ).toBe(false);
  });

  test("accepts a real ISO birth date", () => {
    expect(
      updateCustomerProfileSchema.parse({
        phone: "1134567890",
        birthDate: "1990-05-23",
      }),
    ).toEqual({ phone: "1134567890", birthDate: "1990-05-23" });
  });

  test("normalizes an absent or blank birth date to null", () => {
    expect(
      updateCustomerProfileSchema.parse({ phone: "1134567890" }),
    ).toEqual({ phone: "1134567890", birthDate: null });
    expect(
      updateCustomerProfileSchema.parse({
        phone: "1134567890",
        birthDate: "   ",
      }),
    ).toEqual({ phone: "1134567890", birthDate: null });
  });

  test("rejects malformed and impossible birth dates", () => {
    for (const birthDate of ["23/05/1990", "1990-02-30", "not-a-date"]) {
      expect(
        updateCustomerProfileSchema.safeParse({
          phone: "1134567890",
          birthDate,
        }).success,
      ).toBe(false);
    }
  });
});
