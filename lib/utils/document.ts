import { z } from "zod";

/**
 * A Document is the Brazilian fiscal identifier a Customer must supply: a CPF
 * for a person, a CNPJ for a company (see `CONTEXT.md`). It is stored as
 * digits only; the punctuation is presentation.
 */

export type DocumentKind = "cpf" | "cnpj";

const digitsOf = (value: string) => value.replace(/\D/g, "");

const allSameDigit = (digits: string) => /^(\d)\1+$/.test(digits);

function cpfCheckDigitsValid(digits: string): boolean {
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 || remainder === 11 ? 0 : remainder;
  };

  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

function cnpjCheckDigitsValid(digits: string): boolean {
  const check = (weights: number[]) => {
    const sum = weights.reduce(
      (total, weight, i) => total + Number(digits[i]) * weight,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = check([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = check([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return first === Number(digits[12]) && second === Number(digits[13]);
}

/** `null` when the input is neither a valid CPF nor a valid CNPJ. */
export function documentKind(value: string): DocumentKind | null {
  const digits = digitsOf(value);

  if (digits.length === 11) {
    return !allSameDigit(digits) && cpfCheckDigitsValid(digits) ? "cpf" : null;
  }

  if (digits.length === 14) {
    return !allSameDigit(digits) && cnpjCheckDigitsValid(digits)
      ? "cnpj"
      : null;
  }

  return null;
}

export function isValidDocument(value: string): boolean {
  return documentKind(value) !== null;
}

/**
 * `"12345678909"` -> `"123.456.789-09"`
 * `"11222333000181"` -> `"11.222.333/0001-81"`
 *
 * Returns the input unchanged when it is not 11 or 14 digits, so a
 * half-typed field renders as typed rather than disappearing.
 */
export function formatDocument(value: string): string {
  const digits = digitsOf(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return value;
}

/** Strip punctuation for storage. */
export function normalizeDocument(value: string): string {
  return digitsOf(value);
}

/** Accepts punctuated or bare input; the parsed output is always digits only. */
export const documentSchema = z
  .string()
  .transform(normalizeDocument)
  .refine(isValidDocument, { message: "CPF ou CNPJ inválido" });
