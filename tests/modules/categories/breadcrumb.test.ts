import { describe, expect, test } from "bun:test";
import {
  categoryBreadcrumb,
  categoryTrail,
} from "@/modules/categories/breadcrumb";

const root = {
  name: "Áudio",
  slug: "audio",
  parentName: null,
  parentSlug: null,
};

const child = {
  name: "Fones de ouvido",
  slug: "fones",
  parentName: "Áudio",
  parentSlug: "audio",
};

describe("categoryTrail", () => {
  test("links a child Category through its root", () => {
    expect(categoryTrail(child)).toEqual([
      { label: "Início", href: "/" },
      { label: "Produtos", href: "/produtos" },
      { label: "Áudio", href: "/produtos/audio" },
      { label: "Fones de ouvido", href: "/produtos/audio/fones" },
    ]);
  });

  test("collapses the root segment when the Category is a root", () => {
    expect(categoryTrail(root)).toEqual([
      { label: "Início", href: "/" },
      { label: "Produtos", href: "/produtos" },
      { label: "Áudio", href: "/produtos/audio" },
    ]);
  });
});

describe("categoryBreadcrumb", () => {
  test("ends at a child Category as the page the shopper is on", () => {
    expect(categoryBreadcrumb(child)).toEqual([
      { label: "Início", href: "/" },
      { label: "Produtos", href: "/produtos" },
      { label: "Áudio", href: "/produtos/audio" },
      { label: "Fones de ouvido", href: null },
    ]);
  });

  test("ends at a root Category as the page the shopper is on", () => {
    expect(categoryBreadcrumb(root)).toEqual([
      { label: "Início", href: "/" },
      { label: "Produtos", href: "/produtos" },
      { label: "Áudio", href: null },
    ]);
  });
});
