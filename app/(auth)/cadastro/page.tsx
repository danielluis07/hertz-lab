import type { Metadata } from "next";
import { SignUpForm } from "@/modules/auth/components/sign-up-form";

export const metadata: Metadata = {
  title: "Criar conta",
};

const RegisterPage = async ({ searchParams }: PageProps<"/cadastro">) => {
  const { next } = await searchParams;

  return <SignUpForm next={typeof next === "string" ? next : undefined} />;
};

export default RegisterPage;
