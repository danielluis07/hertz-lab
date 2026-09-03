import type { Metadata } from "next";
import { SignInForm } from "@/modules/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Entrar",
};

/**
 * `?next=` is read here rather than with `useSearchParams` in the form:
 * that hook forces client rendering up to the nearest Suspense boundary
 * during prerender, and a page prop costs nothing.
 */
const LoginPage = async ({ searchParams }: PageProps<"/login">) => {
  const { next } = await searchParams;

  return <SignInForm next={typeof next === "string" ? next : undefined} />;
};

export default LoginPage;
