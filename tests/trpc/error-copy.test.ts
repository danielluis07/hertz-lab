import { describe, expect, it } from "bun:test";
import {
  mutationErrorMessage,
  TRANSPORT_ERROR_MESSAGES,
  TRANSPORT_UNREACHABLE_MESSAGE,
} from "@/trpc/error-copy";

describe("mutationErrorMessage", () => {
  it("falls back to the unreachable copy when the error carries no data", () => {
    expect(mutationErrorMessage({ message: "Failed to fetch" })).toBe(
      TRANSPORT_UNREACHABLE_MESSAGE,
    );
  });

  it("stands down when the error names a field", () => {
    expect(
      mutationErrorMessage({
        message: "Este SKU já existe",
        data: { code: "CONFLICT", field: "sku" },
      }),
    ).toBeNull();
  });

  it("stands down when the error carries a zod tree", () => {
    expect(
      mutationErrorMessage({
        message: "Input validation failed",
        data: { code: "BAD_REQUEST", zodError: { errors: [] } },
      }),
    ).toBeNull();
  });

  it("prefers the procedure's own message over the map", () => {
    expect(
      mutationErrorMessage({
        message: "Este cupom já foi usado",
        data: { code: "CONFLICT" },
      }),
    ).toBe("Este cupom já foi usado");
  });

  it("never shows the message of an internal server error", () => {
    expect(
      mutationErrorMessage({
        message: "Cannot read properties of undefined",
        data: { code: "INTERNAL_SERVER_ERROR" },
      }),
    ).toBe(TRANSPORT_ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  });

  it("uses the map when the procedure wrote no message of its own", () => {
    // tRPC fills an omitted message with the code itself.
    expect(
      mutationErrorMessage({
        message: "UNAUTHORIZED",
        data: { code: "UNAUTHORIZED" },
      }),
    ).toBe(TRANSPORT_ERROR_MESSAGES.UNAUTHORIZED);
  });

  it("falls back to the internal copy for a code it does not know", () => {
    expect(
      mutationErrorMessage({ message: "PARSE_ERROR", data: { code: "PARSE_ERROR" } }),
    ).toBe(TRANSPORT_ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  });
});
