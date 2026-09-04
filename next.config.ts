import type { NextConfig } from "next";

/**
 * The bucket is a *source*, not an asset (ADR-0021): every rendition a shopper
 * downloads is derived by the optimizer, and the uploaded master is never
 * served. That only works if `next/image` is allowed to fetch the object, so
 * the host behind `NEXT_PUBLIC_ASSET_URL` is derived here rather than
 * hardcoded — a bucket swap or a CDN in front of one is an env change and
 * nothing else.
 *
 * `process.env` and not `@/lib/env`: this file is loaded before the app's
 * module graph and its `@` alias exists, and a config that imported the
 * validated env would turn every `next` invocation into an env check. The
 * absence is still loud — the URL constructor throws on a missing or malformed
 * value, at the same moment `lib/env.ts` would have.
 */
const assetUrl = new URL(process.env.NEXT_PUBLIC_ASSET_URL!);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Scoped to the base URL's own path, so a CDN distribution shared with
      // another origin's objects does not become an open optimizer.
      new URL(`${assetUrl.origin}${assetUrl.pathname.replace(/\/$/, "")}/**`),
    ],
  },
};

export default nextConfig;
