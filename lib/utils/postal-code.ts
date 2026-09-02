import { z } from "zod";

/** A CEP: eight digits. Stored as digits only; the hyphen is presentation. */

const digitsOf = (value: string) => value.replace(/\D/g, "");

export function isValidPostalCode(value: string): boolean {
  return digitsOf(value).length === 8;
}

/** `"01310100"` -> `"01310-100"`. Returns the input unchanged if not 8 digits. */
export function formatPostalCode(value: string): string {
  const digits = digitsOf(value);

  if (digits.length !== 8) return value;

  return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
}

export function normalizePostalCode(value: string): string {
  return digitsOf(value);
}

export const postalCodeSchema = z
  .string()
  .transform(normalizePostalCode)
  .refine(isValidPostalCode, { message: "CEP inválido" });
