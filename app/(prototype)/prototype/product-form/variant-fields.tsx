"use client";

/**
 * PROTOTYPE — `modules/products/admin/components/variant-fields.tsx`.
 *
 * The hard case. Eight fields per row, money parsed from pt-BR into cents, and
 * a row that can be removed but never down to zero.
 *
 * This is the component that decided issue #11. There is no `FieldDef[]` that
 * describes it: the rows are a `useFieldArray`, the price field runs
 * `parseBRL` on the way in, and the "cannot remove the last one" rule is a
 * fact about Variants, not about forms.
 */

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, parseBRL } from "@/lib/utils/format";
import { EMPTY_VARIANT, type ProductFormValues } from "./schema";
import { Field } from "./product-form";

export function VariantFields({
  control,
  register,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <fieldset key={field.id} className="rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium">
            Variante {index + 1}
          </legend>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Nome">
              <Input {...register(`variants.${index}.name`)} />
            </Field>
            <Field label="SKU">
              <Input {...register(`variants.${index}.sku`)} />
            </Field>
            <Field label="Preço">
              <Input
                placeholder="R$ 0,00"
                // Money is cents everywhere (CONTEXT.md). `parseBRL` is a
                // global shape helper; what it means here is a module concern.
                {...register(`variants.${index}.priceAmount`, {
                  setValueAs: (value: string) => parseBRL(value) ?? 0,
                })}
              />
            </Field>
            <Field label="Estoque">
              <Input
                type="number"
                {...register(`variants.${index}.stockQuantity`, {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label="Peso (g)">
              <Input
                type="number"
                {...register(`variants.${index}.weightGrams`, {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label="Comprimento (mm)">
              <Input
                type="number"
                {...register(`variants.${index}.lengthMm`, {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label="Largura (mm)">
              <Input
                type="number"
                {...register(`variants.${index}.widthMm`, {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label="Altura (mm)">
              <Input
                type="number"
                {...register(`variants.${index}.heightMm`, {
                  valueAsNumber: true,
                })}
              />
            </Field>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Frete é cotado por peso e dimensões.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              // The rule from `CONTEXT.md`, enforced in the UI as well as the
              // schema so the Admin never reaches an invalid submit.
              disabled={fields.length === 1}
              onClick={() => remove(index)}>
              Remover
            </Button>
          </div>
        </fieldset>
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(EMPTY_VARIANT)}>
          Adicionar variante
        </Button>
      </div>
    </div>
  );
}

/** Exported only so the sketch can show cents round-tripping. */
export const previewPrice = formatBRL;
