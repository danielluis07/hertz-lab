import type { Metadata } from "next";
import { SignInForm } from "@/modules/auth/components/sign-in-form";
import { AUTH_PARAMS } from "@/modules/auth/redirects";

export const metadata: Metadata = {
  title: "Entrar",
};

/**
 * `?retorno=` is read here rather than with `useSearchParams` in the form:
 * that hook forces client rendering up to the nearest Suspense boundary
 * during prerender, and a page prop costs nothing.
 */
const LoginPage = async ({ searchParams }: PageProps<"/login">) => {
  const returnTo = (await searchParams)[AUTH_PARAMS.returnTo];

  return (
    <SignInForm next={typeof returnTo === "string" ? returnTo : undefined} />
  );
};

export default LoginPage;
