import { z } from "zod";
import { phoneSchema } from "@/lib/utils/phone";

/**
 * An optional calendar birth date. Forms may submit their empty control as an
 * empty string or omit it; both become the database's single absent value.
 */
const optionalBirthDateSchema = z
  .union(
    [
      z.iso.date(),
      z.string().trim().length(0),
      z.null(),
    ],
    { error: "Informe uma data de nascimento válida." },
  )
  .optional()
  .transform((value) => value || null);

/** The editable Customer values shared by the profile form and procedure. */
export const updateCustomerProfileSchema = z.object({
  phone: phoneSchema,
  birthDate: optionalBirthDateSchema,
});

export type UpdateCustomerProfileInput = z.infer<
  typeof updateCustomerProfileSchema
>;
