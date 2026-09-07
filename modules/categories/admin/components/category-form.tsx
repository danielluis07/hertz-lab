"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
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
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useSlugFromName } from "@/hooks/use-slug-from-name";
import {
  categorySchema,
  type CategoryFormValues,
} from "@/modules/categories/schemas";
import type { RouterOutput } from "@/trpc/routers/_app";

/**
 * The submit handler an owner supplies. It receives the form as well as the
 * values, because the third error tier is the call site's: a refusal naming a
 * field is rendered by `form.setError` there, and the global toast stands down
 * for it (ADR-0013).
 */
export type CategoryFormSubmit = (
  values: CategoryFormValues,
  form: UseFormReturn<CategoryFormValues>,
) => void;

/**
 * The roots this Category may hang under, read per request by the route that
 * composes the form and handed down as a prop (ADR-0008's rule 4). It travels
 * from `page.tsx` through the wrapper to the body, so it is one type rather
 * than the same prop declared at each stop.
 */
export type CategoryFormOptions = {
  parentOptions: RouterOutput["categories"]["admin"]["parentOptions"];
};

/**
 * What "no parent" reads as. **An item in the list, not an empty trigger**
 * (ADR-0022): making a Category a root is something an Admin picks, and a
 * Select that could only be left blank offers no way back to blank.
 */
const NO_PARENT_LABEL = "Nenhuma — categoria raiz";

/**
 * **One body, and its owners are thin.** This renders every field of a
 * Category; the create and edit wrappers differ only in which hook they fire
 * and where they navigate afterwards. A `mode` prop branching in here would
 * put a rule in a `.tsx`, which `docs/CONVENTIONS.md` forbids — everything
 * below reads the *values* instead.
 *
 * **The picture is not a field here yet.** `categorySchema` carries
 * `imageS3Key` and `NEW_CATEGORY` opens it as `null`, so the value rides
 * through untouched until the upload field lands beside the rest (ADR-0018).
 */
export function CategoryForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
  parentOptions,
}: CategoryFormOptions & {
  defaultValues: CategoryFormValues;
  onSubmit: CategoryFormSubmit;
  isPending: boolean;
  submitLabel: string;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  /**
   * The slug prefills from the name until the Admin types in it. An empty slug
   * is a Category that has never had a URL; a filled one is a public address
   * (ADR-0005) that fixing a typo in the name must not silently rewrite — so
   * the behaviour keys on the *values* and this body still needs no `mode`.
   */
  const slug = useSlugFromName({ form, follows: defaultValues.slug === "" });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values, form))}
      noValidate>
      {/* One attribute disables every control inside while the write is in
          flight — the inputs, the Select and the submit alike — which is what
          a native fieldset is for. */}
      <FieldSet disabled={isPending} className="gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da categoria</CardTitle>
            <CardDescription>
              O nome que organiza a vitrine e o endereço por onde o cliente
              chega até ela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Nome</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="Fones de ouvido"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="slug"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>URL</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      onChange={(event) => {
                        slug.stopFollowing();
                        field.onChange(event);
                      }}
                      placeholder="fones-de-ouvido"
                      aria-invalid={fieldState.invalid}
                    />
                    {/* The words, not the whole address: a child hangs under
                        its parent in the public URL — ADR-0005's
                        `/produtos/audio/fones-de-ouvido` — and the parent
                        arrives here as `{ id, name }` with no slug to build
                        one from. */}
                    <FieldDescription>
                      O trecho da URL pública que identifica a categoria:{" "}
                      {field.value}
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Descrição</FieldLabel>
                    <Textarea
                      {...field}
                      // A textarea binds a string and the column holds `null`
                      // for a Category with no blurb: this is that difference
                      // and nothing more. The schema turns the empty string
                      // back into `null` on the way out.
                      value={field.value ?? ""}
                      id={field.name}
                      rows={4}
                      placeholder="Opcional: o que o cliente encontra nesta seção."
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="parentId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Categoria pai</FieldLabel>
                    {/* Never disabled by the tree (ADR-0022): the form does
                        not encode a rule the server owns, and a Category can
                        gain a child between this render and the save. The
                        fieldset above still greys it while the write is in
                        flight, which is a fact about the request. */}
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id={field.name}
                        className="w-full"
                        aria-invalid={fieldState.invalid}>
                        {/* `SelectValue` takes a function because Base UI
                            renders the raw value otherwise, and an Admin
                            should read "Áudio", not an id. */}
                        <SelectValue>
                          {(selected: string | null) =>
                            selected === null
                              ? NO_PARENT_LABEL
                              : // A root deleted since this page loaded is a
                                // dash rather than a bare id; the save that
                                // names it is refused by the procedure.
                                (parentOptions.find(
                                  (option) => option.id === selected,
                                )?.name ?? "—")
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>{NO_PARENT_LABEL}</SelectItem>
                        {parentOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Só uma categoria raiz pode ser categoria pai: as
                      categorias têm no máximo dois níveis.
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

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
