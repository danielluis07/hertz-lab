import "server-only";

import { env } from "@/lib/env";

/**
 * Holds the AWS secret key, so it must never reach a client bundle. Reading an
 * object key back as a URL is a separate, client-safe concern — see
 * `s3KeyToUrl` in `@/lib/utils/url`.
 */
export const client = new Bun.S3Client({
  region: env.AWS_REGION,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  bucket: env.AWS_BUCKET_NAME,
});
