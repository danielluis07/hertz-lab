/**
 * Runs before every test file — see `[test] preload` in `bunfig.toml`.
 *
 * `lib/env.ts` validates at import time, so anything that transitively imports
 * it needs the whole environment present before the test file loads.
 *
 * These assignments overwrite rather than defer to `.env`. Tests are hermetic:
 * they assert on these exact values, and a developer's local configuration —
 * or a half-filled placeholder in it — must not change whether they pass.
 */
process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/hertz_lab";
process.env.BETTER_AUTH_SECRET = "test-secret";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_ACCESS_KEY_ID = "test-key-id";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
process.env.AWS_BUCKET_NAME = "hertz-lab-test";
process.env.NEXT_PUBLIC_APP_URL = "https://hertzlab.test";
process.env.NEXT_PUBLIC_ASSET_URL = "https://assets.hertzlab.test";
