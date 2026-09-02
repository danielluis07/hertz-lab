import { describe, expect, test } from "bun:test";
import {
  documentKind,
  documentSchema,
  formatDocument,
  isValidDocument,
} from "@/lib/utils/document";

// Synthetic values whose check digits are correct; not anyone's real document.
const VALID_CPF = "12345678909";
const VALID_CNPJ = "11222333000181";

describe("documentKind", () => {
  test("recognises a valid CPF and CNPJ", () => {
    expect(documentKind(VALID_CPF)).toBe("cpf");
    expect(documentKind(VALID_CNPJ)).toBe("cnpj");
  });

  test("accepts punctuated input", () => {
    expect(documentKind("123.456.789-09")).toBe("cpf");
    expect(documentKind("11.222.333/0001-81")).toBe("cnpj");
  });

  test("rejects a wrong check digit", () => {
    expect(documentKind("12345678900")).toBeNull();
    expect(documentKind("11222333000180")).toBeNull();
  });

  test("rejects repeated digits, which pass the arithmetic but are not documents", () => {
    expect(documentKind("11111111111")).toBeNull();
    expect(documentKind("00000000000")).toBeNull();
    expect(documentKind("11111111111111")).toBeNull();
  });

  test("rejects the wrong length", () => {
    expect(documentKind("123456789")).toBeNull();
    expect(documentKind("123456789091")).toBeNull();
    expect(documentKind("")).toBeNull();
  });
});

describe("formatDocument", () => {
  test("punctuates by length", () => {
    expect(formatDocument(VALID_CPF)).toBe("123.456.789-09");
    expect(formatDocument(VALID_CNPJ)).toBe("11.222.333/0001-81");
  });

  test("leaves a half-typed value alone", () => {
    expect(formatDocument("123")).toBe("123");
  });
});

describe("documentSchema", () => {
  test("parses to digits only", () => {
    expect(documentSchema.parse("123.456.789-09")).toBe(VALID_CPF);
  });

  test("rejects an invalid document", () => {
    expect(documentSchema.safeParse("12345678900").success).toBe(false);
  });
});

describe("isValidDocument", () => {
  test("agrees with documentKind", () => {
    expect(isValidDocument(VALID_CPF)).toBe(true);
    expect(isValidDocument("12345678900")).toBe(false);
  });
});
