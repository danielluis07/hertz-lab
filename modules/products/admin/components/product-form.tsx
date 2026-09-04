"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
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
import { slugify } from "@/lib/utils/slug";
import { SpecificationFields } from "@/modules/products/admin/components/specification-fields";
import { VariantFields } from "@/modules/products/admin/components/variant-fields";
import {
  productSchema,
  type ProductFormValues,
} from "@/modules/products/schemas";
import type { RouterOutput } from "@/trpc/routers/_app";

/**
 * The submit handler an owner supplies. It receives the form as well as the
 * values, because the third error tier is the call site's: a `CONFLICT` naming
 * a field is rendered by `form.setError` there, and the global toast stands
 * down for it (ADR-0013).
 */
export type ProductFormSubmit = (
  values: ProductFormValues,
  form: UseFormReturn<ProductFormValues>,
) => void;

/**
 * **One body, and its owners are thin.** This renders every field of a
 * Product; the create and edit wrappers differ only in which hook they fire
 * and where they navigate afterwards (ADR-0019). A `mode` prop branching in
 * here would put a rule in a `.tsx`, which `docs/CONVENTIONS.md` forbids —
 * everything below reads the *values* instead.
 *
 * The Brand and Category options arrive as props: the route composes the three
 * modules and reads them through `caller` (ADR-0008's rule 4), so nothing here
 * fetches another module's rows.
 */
export function ProductForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
  brands,
  categories,
}: {
  defaultValues: ProductFormValues;
  onSubmit: ProductFormSubmit;
  isPending: boolean;
  submitLabel: string;
  brands: RouterOutput["brands"]["admin"]["options"];
  categories: RouterOutput["categories"]["admin"]["options"];
}) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  // `useWatch`, never `form.watch()`: the latter re-renders on every keystroke
  // of every field and opts this component out of the React Compiler.
  const name = useWatch({ control: form.control, name: "name" });
  const hasTypedSlug = form.formState.dirtyFields.slug ?? false;

  /**
   * The slug follows the name while the Admin has not typed in it, so nobody
   * writes the same words twice. Form behaviour rather than a rule
   * (`docs/PRODUCTS-ADMIN.md`), and it keys on the *values* rather than on a
   * mode: an empty slug is a Product that has never had a URL, while a filled
   * one is a public address (ADR-0005) that fixing a typo in the name must not
   * silently rewrite.
   */
  const followsName = defaultValues.slug === "";

  useEffect(() => {
    if (!followsName || hasTypedSlug) return;

    // No `shouldDirty`: the prefill itself must not read as the Admin taking
    // the field over, or the first keystroke in the name would end it.
    form.setValue("slug", slugify(name));
  }, [followsName, form, hasTypedSlug, name]);

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values, form))}
      noValidate>
      {/* One attribute disables every control inside while the write is in
          flight — inputs, the two "Adicionar" buttons and the submit alike —
          which is what a native fieldset is for. */}
      <FieldSet disabled={isPending} className="gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do produto</CardTitle>
            <CardDescription>
              O que o cliente lê antes de escolher uma variação.
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
                      placeholder="Fone de Ouvido Bluetooth XYZ"
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
                      placeholder="fone-de-ouvido-bluetooth-xyz"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      O endereço público do produto: /produto/{field.value}
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
                      id={field.name}
                      rows={6}
                      placeholder="Para quem é, o que faz e por que vale a pena."
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="brandId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Marca</FieldLabel>
                      {/* The control's empty value is null and the form's is
                          "", which is what `productSchema` refuses. */}
                      <Select
                        value={field.value || null}
                        onValueChange={(next: string | null) =>
                          field.onChange(next ?? "")
                        }>
                        <SelectTrigger
                          id={field.name}
                          className="w-full"
                          aria-invalid={fieldState.invalid}>
                          <SelectValue>
                            {(selected: string | null) =>
                              brands.find((brand) => brand.id === selected)
                                ?.name ?? "Selecione a marca"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  name="categoryId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Categoria</FieldLabel>
                      <Select
                        value={field.value || null}
                        onValueChange={(next: string | null) =>
                          field.onChange(next ?? "")
                        }>
                        <SelectTrigger
                          id={field.name}
                          className="w-full"
                          aria-invalid={fieldState.invalid}>
                          <SelectValue>
                            {(selected: string | null) =>
                              categories.find(
                                (category) => category.id === selected,
                              )?.name ?? "Selecione a categoria"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variações</CardTitle>
            <CardDescription>
              O que o cliente compra de fato: cada variação tem o seu SKU,
              preço, estoque e dimensões.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariantFields control={form.control} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Especificações</CardTitle>
            <CardDescription>
              A ficha técnica que o cliente lê na página do produto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpecificationFields control={form.control} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">
            {isPending && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </div>
      </FieldSet>
    </form>
  );
}
