"use client";

/**
 * PROVISIONAL — a harness for exercising Better Auth end to end.
 *
 * It is the real shadcn `Field` + React Hook Form shape and the real
 * `authClient` call, so what it proves about sign in is true. What it is not
 * is the storefront's final sign-in screen: no social providers, no "esqueci
 * minha senha", and the failure copy is rendered inline rather than through
 * whatever the shop settles on. Replace the presentation, keep the wiring.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/modules/auth/errors";
import { postAuthPath } from "@/modules/auth/redirects";
import { signInSchema, type SignInValues } from "@/modules/auth/schemas";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignInValues) => {
    setFormError(null);

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error || !data) {
      setFormError(getErrorMessage(error?.code ?? "", "ptBr"));
      return;
    }

    // The session cookie is set by the time this resolves, so the destination's
    // server components see an authenticated request. `push` alone: since Next
    // 15 the client cache's dynamic staleTime is 0, so a `refresh()` here would
    // only re-render the page that just rendered (docs/DATA-FLOW.md).
    router.push(postAuthPath(data.user.role, next));
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua conta da Hertz Lab.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {formError && <FieldError>{formError}</FieldError>}

            <Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                Entrar
              </Button>
              <FieldDescription className="text-center">
                Não tem uma conta? <Link href="/cadastro">Cadastre-se</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
