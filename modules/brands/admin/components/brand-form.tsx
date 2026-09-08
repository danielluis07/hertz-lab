"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { brandSchema, type BrandFormValues } from "@/modules/brands/schemas";
import type { RouterOutput } from "@/trpc/routers/_app";

/**
 * The submit handler an owner supplies. It receives the form as well as the
 * values, because the third error tier is the call site's: a refusal naming a
 * field is rendered by `form.setError` there, and the global toast stands down
 * for it (ADR-0013).
 */
export type BrandFormSubmit = (
  values: BrandFormValues,
  form: UseFormReturn<BrandFormValues>,
) => void;

/**
 * One row of the admin list — **the only thing this form has to edit from**,
 * and the reason it may be a dialog at all (ADR-0026). A dialog mounts on a
 * click rather than on a navigation, so it has no prefetch site of its own and
 * reads nothing the list route did not already hydrate. There is no `byId`,
 * and adding one reopens the ADR.
 *
 * Note the absent `["items"]`: `list` returns a bare array, because a bounded
 * set declines pagination and so needs no `total` (ADR-0025).
 *
 * The edit wrapper's props are `Pick`ed from this type rather than declared as
 * `{ id: string; name: string }`, which is what closes the pairing the ADR
 * asks for: a field this form grows has to arrive through those props, and a
 * field `list` does not select cannot be `Pick`ed. The failure is a **type
 * error** rather than a blank input saving an empty string over real data.
 */
export type BrandRow = RouterOutput["brands"]["admin"]["list"][number];

/**
 * **One body, and its owners are thin.** This renders the whole of a Brand —
 * one text input, because a name is the whole entity (`CONTEXT.md`). The
 * create and edit wrappers differ only in which hook they fire and which
 * dialog they close, and a `mode` prop branching in here would put a rule in a
 * `.tsx`, which `docs/CONVENTIONS.md` forbids.
 *
 * **It knows nothing about the dialog it opens in.** No `Dialog` import, no
 * `open` state, no `onOpenChange` — the chrome and the closing belong to each
 * wrapper (ADR-0026), and there is no shell between them holding either.
 *
 * **There is no `form.reset()`, here or in a wrapper.** Base UI unmounts a
 * closed dialog's popup, so this component remounts on every open and re-reads
 * `defaultValues` from the freshly invalidated row: the unmount does the
 * resetting, which is also why `keepMounted` must never be passed.
 */
export function BrandForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
}: {
  defaultValues: BrandFormValues;
  onSubmit: BrandFormSubmit;
  isPending: boolean;
  submitLabel: string;
}) {
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues,
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values, form))}
      noValidate>
      {/* One attribute disables every control inside while the write is in
          flight — the input and the submit alike — which is what a native
          fieldset is for. */}
      <FieldSet disabled={isPending} className="gap-6">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nome</FieldLabel>
                {/* No `autoFocus`: Base UI already moves focus to the first
                    tabbable element in the popup, which is this input, and it
                    deliberately does not on a touch open — where focusing it
                    would throw up the virtual keyboard over the dialog. */}
                <Input
                  {...field}
                  id={field.name}
                  placeholder="JBL"
                  aria-invalid={fieldState.invalid}
                />
                {/* Where the write's refusal lands: a duplicate name comes
                    back naming this input, so the sentence arrives under the
                    field it is about rather than as a toast the Admin has to
                    match up by hand (ADR-0013). */}
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex items-center justify-end">
          <Button type="submit">
            {isPending && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </div>
      </FieldSet>
    </form>
  );
}
