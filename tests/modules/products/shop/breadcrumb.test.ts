import { describe, expect, test } from "bun:test";
import { productBreadcrumb } from "@/modules/products/shop/breadcrumb";

describe("productBreadcrumb", () => {
  test("walks a child Category through its root to the Product", () => {
    expect(
      productBreadcrumb({
        name: "Fone WH-1000XM5",
        category: {
          name: "Fones de ouvido",
          slug: "fones",
          parentName: "Áudio",
          parentSlug: "audio",
        },
      }),
    ).toEqual([
      { label: "Início", href: "/" },
      { label: "Produtos", href: "/produtos" },
      { label: "Áudio", href: "/produtos/audio" },
      { label: "Fones de ouvido", href: "/produtos/audio/fones" },
      { label: "Fone WH-1000XM5", href: null },
    ]);
  });

  test("collapses the root segment when the Category is a root", () => {
    expect(
      productBreadcrumb({
        name: "Caixa Flip 6",
        category: {
          name: "Áudio",
          slug: "audio",
          parentName: null,
          parentSlug: null,
        },
      }),
    ).toEqual([
      { label: "Início", href: "/" },
      { label: "Produtos", href: "/produtos" },
      { label: "Áudio", href: "/produtos/audio" },
      { label: "Caixa Flip 6", href: null },
    ]);
  });
});
