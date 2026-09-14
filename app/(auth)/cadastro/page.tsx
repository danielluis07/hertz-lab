import type { Metadata } from "next";
import { SignUpForm } from "@/modules/auth/components/sign-up-form";
import { AUTH_PARAMS } from "@/modules/auth/redirects";

export const metadata: Metadata = {
  title: "Criar conta",
};

const RegisterPage = async ({ searchParams }: PageProps<"/cadastro">) => {
  const returnTo = (await searchParams)[AUTH_PARAMS.returnTo];

  return (
    <SignUpForm next={typeof returnTo === "string" ? returnTo : undefined} />
  );
};

export default RegisterPage;
