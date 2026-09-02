import { describe, expect, test } from "bun:test";
import { absoluteUrl, s3KeyToUrl } from "@/lib/utils/url";

// The bases come from tests/setup.ts.
const APP = "https://hertzlab.test";
const ASSETS = "https://assets.hertzlab.test";

describe("absoluteUrl", () => {
  test("joins a path onto the app URL", () => {
    expect(absoluteUrl("/produtos")).toBe(`${APP}/produtos`);
  });

  test("tolerates a missing leading slash", () => {
    expect(absoluteUrl("produtos")).toBe(`${APP}/produtos`);
  });
});

describe("s3KeyToUrl", () => {
  test("joins an object key onto the asset URL", () => {
    expect(s3KeyToUrl("produtos/fone.jpg")).toBe(`${ASSETS}/produtos/fone.jpg`);
  });

  test("tolerates a leading slash on the key", () => {
    expect(s3KeyToUrl("/produtos/fone.jpg")).toBe(
      `${ASSETS}/produtos/fone.jpg`,
    );
  });

  test("encodes characters that would otherwise end the path", () => {
    // Unescaped, the '#' would start a fragment and the rest of the filename
    // would never reach S3.
    expect(s3KeyToUrl("produtos/fone #1.jpg")).toBe(
      `${ASSETS}/produtos/fone%20%231.jpg`,
    );
    expect(s3KeyToUrl("produtos/fone?v=2.jpg")).toBe(
      `${ASSETS}/produtos/fone%3Fv%3D2.jpg`,
    );
  });

  test("encodes accented filenames", () => {
    expect(s3KeyToUrl("marcas/áudio.png")).toBe(
      `${ASSETS}/marcas/%C3%A1udio.png`,
    );
  });

  test("keeps the separators between segments", () => {
    expect(s3KeyToUrl("a/b/c/d.jpg")).toBe(`${ASSETS}/a/b/c/d.jpg`);
  });

  test("produces a URL that parses back to the original key", () => {
    const key = "produtos/fone bluetooth #1 (novo).jpg";
    const url = new URL(s3KeyToUrl(key));
    expect(decodeURIComponent(url.pathname)).toBe(`/${key}`);
    expect(url.hash).toBe("");
    expect(url.search).toBe("");
  });
});
