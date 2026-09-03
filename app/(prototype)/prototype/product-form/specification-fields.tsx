"use client";

/**
 * PROTOTYPE — `modules/products/admin/components/specification-fields.tsx`.
 *
 * The other repeating group, and deliberately **not** the same component as
 * `VariantFields`. Two text fields, no money, no minimum, and rows that may go
 * to zero. Sharing a `<FieldArray>` between the two would be an abstraction
 * over "almost the same" — the exact move issue #11 was asked to rule on.
 */

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductFormValues } from "./schema";

export function SpecificationFields({
  control,
  register,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "specifications",
  });

  return (
    <div className="flex flex-col gap-2">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma especificação. A ficha técnica é opcional.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-2">
          <Input
            placeholder="Impedância"
            {...register(`specifications.${index}.label`)}
          />
          <Input placeholder="32 Ω" {...register(`specifications.${index}.value`)} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(index)}>
            Remover
          </Button>
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ label: "", value: "" })}>
          Adicionar especificação
        </Button>
      </div>
    </div>
  );
}
