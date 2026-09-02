import { env } from "@/lib/env";

/**
 * An absolute URL for this deployment. Needed wherever a relative path will
 * not do: OG and canonical metadata, and the return URLs a payment provider
 * redirects a shopper back to.
 */
export function absoluteUrl(path: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Images are stored as S3 object keys, never URLs — "buckets and CDNs change,
 * history should not" (`db/schema/catalog.ts`). That only holds if exactly one
 * function turns a key into a URL, and this is it.
 *
 * Catalog imagery is public, so this is a pure string join rather than a
 * presigned read: presigning marketing images costs a round trip and defeats
 * caching for no security benefit. Presigning lives in `lib/s3.ts`, which is
 * server-only and handles uploads.
 */
export function s3KeyToUrl(key: string): string {
  const base = env.NEXT_PUBLIC_ASSET_URL.replace(/\/$/, "");
  return `${base}/${key.replace(/^\//, "")}`;
}
