import { describe, expect, test } from "bun:test";
import { slugify } from "@/lib/utils/slug";

describe("slugify", () => {
  test("strips Portuguese diacritics", () => {
    expect(slugify("Áudio Automotivo")).toBe("audio-automotivo");
    expect(slugify("Fones de Ouvido")).toBe("fones-de-ouvido");
    expect(slugify("Caixa de Som Portátil")).toBe("caixa-de-som-portatil");
    expect(slugify("Conexão")).toBe("conexao");
  });

  test("collapses punctuation and whitespace into single hyphens", () => {
    expect(slugify("JBL  Flip 6 — Bluetooth")).toBe("jbl-flip-6-bluetooth");
    expect(slugify("Sony WH-1000XM5")).toBe("sony-wh-1000xm5");
  });

  test("trims leading and trailing hyphens", () => {
    expect(slugify("  Headphones!  ")).toBe("headphones");
    expect(slugify("---audio---")).toBe("audio");
  });

  test("is idempotent", () => {
    const once = slugify("Áudio & Vídeo");
    expect(slugify(once)).toBe(once);
  });

  test("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });
});
