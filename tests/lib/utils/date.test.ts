import { describe, expect, test } from "bun:test";
import { formatDate } from "@/lib/utils/date";

// Midday UTC keeps these assertions on one calendar day in Brazilian time zones.
const date = new Date("2026-09-02T12:00:00Z");

describe("formatDate", () => {
  test("defaults to the short pt-BR form", () => {
    expect(formatDate(date)).toBe("02/09/2026");
    expect(formatDate(date, "short")).toBe("02/09/2026");
  });

  test("spells the month out in the long form", () => {
    expect(formatDate(date, "long")).toBe("2 de setembro de 2026");
  });

  test("includes the time in the datetime form", () => {
    expect(formatDate(date, "datetime")).toMatch(
      /^02\/09\/2026,? \d{2}:\d{2}$/,
    );
  });
});
