import "server-only";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { category } from "@/db/schema";
import { client } from "@/lib/s3";
import { imageUploadSchema, IMAGE_EXTENSIONS } from "@/lib/utils/image";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";
import {
  CATEGORY_IMAGE_PREFIX,
  isCategoryImageKey,
} from "@/modules/categories/images";

/**
 * How long a minted upload URL is good for. Long enough for a large photograph
 * on a Brazilian connection, short enough that a URL copied out of the network
 * tab is worthless by the time it is used.
 *
 * The same number the products module keeps, and a second copy of it on
 * purpose: categories may not import products (ADR-0009), and a global home
 * for one constant two modules happen to agree on would be the global layer
 * knowing a rule (ADR-0007).
 */
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

export const adminRouter = createTRPCRouter({
  /**
   * Every Category as `{ id, name }`, unpaginated — the twin of
   * `brands.admin.options`, and there for the same composing route
   * (ADR-0008's rule 4).
   *
   * **Flat, and sorted by name.** The tree is real — a Category has a
   * `parentId` — but a filter asks "which section", not "where in the
   * hierarchy", and an indented tree is the categories list's own surface to
   * build. Nothing here knows the tree, so nothing here goes stale when it
   * gains one.
   */
  options: adminProcedure.query(async () =>
    db
      .select({ id: category.id, name: category.name })
      .from(category)
      .orderBy(asc(category.name)),
  ),

  /**
   * Authorises one Category picture upload: takes what the browser knows about
   * the file and returns the key it will be stored under together with a
   * presigned PUT (ADR-0018). The file never transits this server.
   *
   * **The key is minted here, and that is the whole point.** A client that
   * cannot name a key cannot overwrite an existing object, cannot escape the
   * `categories/` prefix, and cannot put a filename of its own choosing in
   * front of anyone. It is `categories/<uuidv7>.<ext>`, reusing the
   * `Bun.randomUUIDv7()` that `db/schema/columns.ts` already mints ids with.
   *
   * **This is the products procedure's twin and not a call to it.** The prefix
   * is what differs, and it is what makes a `categories/` key a different
   * object from a `products/` one — so a shared implementation would have to
   * take the prefix from its caller, and importing the products module to get
   * one is what ADR-0009 forbids outright.
   *
   * **Neither the size nor the type is enforced by the signature.** `presign`
   * signs one method and has no `content-length-range`, and a query-signed PUT
   * does not carry `Content-Type` among its signed headers — S3 takes a
   * mismatched one. So the input's `contentType` decides what the object will
   * be *called*, the input's `size` refuses the Admin before the bytes move,
   * and the write that keeps the key `stat`s the object as the guard that
   * holds (ADR-0018). That write is the Category form's, and lands with it.
   *
   * The refusals an Admin reads for a bad file are `imageUploadSchema`'s, in
   * pt-BR beside the rule they enforce (ADR-0013).
   *
   * Named for the act rather than the mechanism (ADR-0010), so a later move to
   * a POST policy does not rename it.
   */
  createImageUpload: adminProcedure
    .input(imageUploadSchema)
    .mutation(({ input }) => {
      const key = `${CATEGORY_IMAGE_PREFIX}/${Bun.randomUUIDv7()}.${
        IMAGE_EXTENSIONS[input.contentType]
      }`;

      const url = client.presign(key, {
        method: "PUT",
        type: input.contentType,
        expiresIn: UPLOAD_URL_TTL_SECONDS,
      });

      return { key, url };
    }),

  /**
   * Throws away an upload nobody kept: the object behind a tile the Admin
   * removed before the Category was ever saved with it. **The one orphan we
   * can see, so we take it** (ADR-0018) — every other abandoned object stays,
   * because there is no scheduled runner to sweep them and a sweep nobody runs
   * reads as though orphans were handled.
   *
   * Two things make an admin-only delete-by-key safe to expose. The key must
   * look like one *this module* minted, so no path can be walked out of the
   * prefix and a `products/` key is refused here; and **an object a `category`
   * row references is refused**, which is what confines this to uploads that
   * were never persisted. A persisted picture's object dies with the write
   * that drops its key.
   *
   * That second guard is why this cannot be the products procedure under
   * another name: "a key any `product_image` row references is refused" and
   * "a key any `category` row references is refused" are two queries against
   * two tables, and a procedure that ran only one of them would delete the
   * other module's live object.
   *
   * **It never throws for a failed delete.** The Admin asked to remove a tile,
   * not to clean a bucket, and a toast about S3 for an act that visibly
   * succeeded would be noise; what is left behind is exactly the orphan
   * ADR-0018 already tolerates.
   */
  discardImageUpload: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      if (!isCategoryImageKey(input.key)) return { discarded: false };

      const [persisted] = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.imageS3Key, input.key))
        .limit(1);

      if (persisted) return { discarded: false };

      try {
        await client.delete(input.key);
      } catch {
        return { discarded: false };
      }

      return { discarded: true };
    }),
});
