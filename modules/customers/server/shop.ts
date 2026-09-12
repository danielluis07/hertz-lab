import "server-only";

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customerProfile } from "@/db/schema";
import { updateCustomerProfileSchema } from "@/modules/customers/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

/** The one public profile shape shared by the read and write response. */
const profileFields = {
  document: customerProfile.document,
  phone: customerProfile.phone,
  birthDate: customerProfile.birthDate,
};

/**
 * Customer profile operations for the Storefront. Both procedures derive the
 * owner from the authenticated session; a User id is never public input.
 */
export const shopRouter = createTRPCRouter({
  /**
   * The ambient User's commerce profile, or `null` before checkout creates it.
   * Dates remain calendar strings so the result is safe to dehydrate directly.
   */
  profile: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await db
      .select(profileFields)
      .from(customerProfile)
      .where(eq(customerProfile.userId, ctx.auth.user.id))
      .limit(1);

    return profile ?? null;
  }),

  /**
   * Update only an existing profile. Customer creation belongs to checkout,
   * and Document is immutable on this surface, so neither can enter the input.
   */
  updateProfile: protectedProcedure
    .input(updateCustomerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const [profile] = await db
        .update(customerProfile)
        .set({
          phone: input.phone,
          birthDate: input.birthDate,
          updatedAt: new Date(),
        })
        .where(eq(customerProfile.userId, ctx.auth.user.id))
        .returning(profileFields);

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seu perfil de cliente não existe mais.",
        });
      }

      return profile;
    }),
});
