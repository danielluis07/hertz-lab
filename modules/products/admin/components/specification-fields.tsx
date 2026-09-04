"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EMPTY_SPECIFICATION } from "@/modules/products/constants";
import type { ProductFormValues } from "@/modules/products/schemas";

/**
 * The technical sheet, as label/value rows an Admin adds and removes
 * ("Impedância", "32 Ω"). Descriptive text for the shopper and never a filter
 * facet (`CONTEXT.md`), which is why it is a free pair of strings and not a
 * vocabulary of its own.
 *
 * Unlike the Variants beside it, the array may be empty: a Product with no
 * specifications is a Product nobody has written a sheet for yet.
 */
export function SpecificationFields({
  control,
}: {
  control: Control<ProductFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "specifications",
  });

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma especificação. A ficha técnica é opcional.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-3">
          <Controller
            control={control}
            name={`specifications.${index}.label`}
            render={({ field: labelField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={labelField.name}>Item</FieldLabel>
                <Input
                  {...labelField}
                  id={labelField.name}
                  placeholder="Impedância"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name={`specifications.${index}.value`}
            render={({ field: valueField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={valueField.name}>Valor</FieldLabel>
                <Input
                  {...valueField}
                  id={valueField.name}
                  placeholder="32 Ω"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            aria-label={`Remover especificação ${index + 1}`}>
            <Trash2Icon />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => append(EMPTY_SPECIFICATION)}>
        <PlusIcon data-icon="inline-start" />
        Adicionar especificação
      </Button>
    </div>
  );
}
