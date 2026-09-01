import type { authClient } from "@/lib/auth-client";

export type UserRole = "admin" | "user";

export type Session = typeof authClient.$Infer.Session;

export type ErrorTypes = Partial<
  Record<
    keyof typeof authClient.$ERROR_CODES,
    {
      en: string;
      ptBr: string;
    }
  >
>;
