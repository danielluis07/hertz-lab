import { describe, expect, test } from "bun:test";
import { AUTH_PARAMS, loginHref } from "@/modules/auth/redirects";

describe("loginHref", () => {
  test("carries the return path under the public parameter", () => {
    const url = new URL(loginHref("/produto/fone-hx-1"), "http://localhost");

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get(AUTH_PARAMS.returnTo)).toBe(
      "/produto/fone-hx-1",
    );
    expect([...url.searchParams.keys()]).toEqual(["retorno"]);
  });

  test("keeps a return path's own query string intact", () => {
    const url = new URL(
      loginHref("/minha-conta/favoritos?pagina=2"),
      "http://localhost",
    );

    expect(url.searchParams.get(AUTH_PARAMS.returnTo)).toBe(
      "/minha-conta/favoritos?pagina=2",
    );
  });
});
