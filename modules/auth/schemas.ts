import { z } from "zod";

/**
 * Better Auth's own `emailAndPassword` bounds, restated so the browser can
 * refuse a password the server would have refused anyway. Changing either
 * here without changing `lib/auth.ts` only moves where the rejection happens.
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export const signInSchema = z.object({
  email: z.email({ message: "E-mail inválido" }),
  // Length is not re-checked on sign in: the only useful answer to a wrong
  // password is Better Auth's, and telling a visitor their existing password
  // is "too short" would be a lie about the credential, not about the form.
  password: z.string().min(1, { message: "Informe sua senha" }),
});

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Informe seu nome" })
      .max(80, { message: "Nome muito longo" }),
    email: z.email({ message: "E-mail inválido" }),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        message: `A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`,
      })
      .max(PASSWORD_MAX_LENGTH, { message: "Senha muito longa" }),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "As senhas não coincidem",
    path: ["passwordConfirmation"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
