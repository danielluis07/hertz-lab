"use client";

/**
 * PROTOTYPE — the stress sketch. `modules/products/admin/components/product-form.tsx`.
 *
 *   bun dev  ->  http://localhost:3000/prototype/product-form
 *
 * Rough on purpose: no submit, no toasts, no S3. What it exists to show is the
 * **shape** — one React Hook Form over a nested payload, with the two repeating
 * groups as sibling components that receive `control` and own their own markup.
 *
 * Why this is the shape:
 *
 * - **One form, one mutation.** A Product with no Variant is invalid, so create
 *   cannot be staged. The whole tree is one `products.admin.create` call.
 * - **Images are the exception and go out of band.** ADR-0012 has no Server
 *   Actions, so the file goes straight to S3 against a presigned URL from a
 *   procedure, and the form only ever carries the resulting key.
 * - **Nothing here is promotable yet.** `VariantFields` and `SpecificationFields`
 *   are both `useFieldArray`, and they are not the same component: two text
 *   inputs versus eight fields with money parsing and its own image slot.
 *   Promote on the second caller, and this is not it.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_VARIANT,
  productSchema,
  type ProductFormValues,
} from "./schema";
import { SpecificationFields } from "./specification-fields";
import { VariantFields } from "./variant-fields";
import { ImageUpload } from "./image-upload";

export function ProductForm() {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      brandId: "",
      categoryId: "",
      status: "draft",
      images: [],
      // The schema's `.min(1)` means the form opens with a Variant already
      // there. An empty variants array would be a form that is invalid before
      // the Admin has typed anything.
      variants: [EMPTY_VARIANT],
      specifications: [],
    },
  });

  // `useWatch`, not `form.watch()`: the latter returns a function React
  // Compiler cannot memoize, and it opts the whole component out. The lint
  // rule catches it — worth knowing before the real form is written.
  const values = useWatch({ control: form.control });

  return (
    <form
      // No submit: the sketch stops at the payload. In real code this is
      // `useSaveProduct()` — the module hook that owns invalidation and the
      // success toast, per ADR-0012.
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-8">
      <Section title="Produto">
        <Field label="Nome" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </Field>
        <Field label="Slug" error={form.formState.errors.slug?.message}>
          <Input {...form.register("slug")} />
        </Field>
        <Field
          label="Descrição"
          error={form.formState.errors.description?.message}>
          <textarea
            {...form.register("description")}
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          />
        </Field>
        <Field label="Status">
          <select
            {...form.register("status")}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </Field>
      </Section>

      <Section title="Imagens">
        <ImageUpload control={form.control} />
      </Section>

      <Section
        title="Variantes"
        hint="A unidade vendável. Todo produto tem ao menos uma.">
        <VariantFields control={form.control} register={form.register} />
        {form.formState.errors.variants?.root?.message && (
          <p className="text-sm text-destructive">
            {form.formState.errors.variants.root.message}
          </p>
        )}
      </Section>

      <Section title="Ficha técnica">
        <SpecificationFields
          control={form.control}
          register={form.register}
        />
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit">Salvar produto</Button>
        <span className="text-xs text-muted-foreground">
          PROTOTYPE — no submit; the payload is below.
        </span>
      </div>

      <details className="rounded-lg border">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium">
          Payload — one `products.admin.create` call
        </summary>
        <pre className="overflow-x-auto border-t px-3 py-2 text-xs">
          <code>{JSON.stringify(values, null, 2)}</code>
        </pre>
      </details>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    // In real code this is shadcn's `Field` (docs/STACK.md); it is not
    // generated into `components/ui/` yet, so the sketch inlines it.
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
