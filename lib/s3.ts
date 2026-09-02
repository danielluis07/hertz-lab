import { env } from "@/lib/env";

export const client = new Bun.S3Client({
  region: env.AWS_REGION,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  bucket: env.AWS_BUCKET_NAME,
});
