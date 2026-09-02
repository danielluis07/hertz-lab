import { z } from "zod";

/**
 * A Brazilian phone number with area code: 10 digits for a landline, 11 for a
 * mobile. Stored as digits only; the punctuation is presentation.
 */

const digitsOf = (value: string) => value.replace(/\D/g, "");

export function isValidPhone(value: string): boolean {
  const digits = digitsOf(value);

  if (digits.length !== 10 && digits.length !== 11) return false;

  // Area codes run from 11 to 99; none start with 0.
  if (Number(digits.slice(0, 2)) < 11) return false;

  // An 11-digit number is a mobile, and every mobile line starts with 9.
  if (digits.length === 11 && digits[2] !== "9") return false;

  return true;
}

/**
 * `"11987654321"` -> `"(11) 98765-4321"`
 * `"1134567890"` -> `"(11) 3456-7890"`
 *
 * Returns the input unchanged when it is not 10 or 11 digits.
 */
export function formatPhone(value: string): string {
  const digits = digitsOf(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return value;
}

export function normalizePhone(value: string): string {
  return digitsOf(value);
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine(isValidPhone, { message: "Telefone inválido" });
