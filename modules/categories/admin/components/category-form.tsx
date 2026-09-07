"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { ImageTile, ImageUploadField } from "@/components/image-upload-field";
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
import { s3KeyToUrl } from "@/lib/utils/url";
import { useCategoryImage } from "@/modules/categories/admin/hooks/use-category-image";
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
 * **The picture is one field and no more.** `useCategoryImage` is called here
 * rather than beside the tile because the submit button is its second reader: a
 * Category must not be saved having lost a file that was still going up
 * (ADR-0018).
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
   * The one picture a Category may carry, and the file that is still on its way
   * to becoming it (ADR-0018). `persistedKey` is what the row was loaded
   * holding, which is what decides whether a replaced key's object is ours to
   * throw away now or the `update`'s to delete after it commits.
   */
  const image = useCategoryImage({
    form,
    persistedKey: defaultValues.imageS3Key,
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

        <Card>
          <CardHeader>
            <CardTitle>Imagem</CardTitle>
            <CardDescription>
              A imagem quadrada que representa a categoria na vitrine. A
              categoria funciona sem ela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* **The same picker a Product photograph goes through**
                (ADR-0021), so there is one thing to learn: the same spec
                panel, the same refusals, the same bar. `multiple` is passed
                even though it is the default, because "a Category has one
                picture" is the fact this line is here to state. What hangs
                inside the tile is what differs, and for a Category it is
                nothing — no alt text, no "Capa" badge, no Variant, none of
                which is a rule about a Category. */}
            <ImageUploadField
              id="category-image"
              // Picking a file when one is already saved replaces it, so the
              // label says so rather than letting the Admin discover it.
              label={image.s3Key ? "Trocar a imagem" : "Adicionar uma imagem"}
              multiple={false}
              upload={image.upload}>
              {image.s3Key && (
                <ImageTile src={s3KeyToUrl(image.s3Key)}>
                  {/* Where the write's refusal lands: `create` and `update`
                      `stat` the object and name this field, so the sentence
                      arrives on the picture it is about (ADR-0013). */}
                  <FieldError errors={[form.formState.errors.imageS3Key]} />

                  {/* No confirmation: removing the picture is a field edit,
                      undone by picking the file again (ADR-0018). */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={image.remove}>
                    <Trash2Icon data-icon="inline-start" />
                    Remover
                  </Button>
                </ImageTile>
              )}
            </ImageUploadField>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {/* Said out loud rather than left for the Admin to work out from a
              greyed-out button (ADR-0018). */}
          {image.upload.isUploading && (
            <p className="text-muted-foreground text-sm">
              Aguarde o envio da imagem para salvar.
            </p>
          )}

          <Button type="submit" disabled={image.upload.isUploading}>
            {isPending && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </div>
      </FieldSet>
    </form>
  );
}
