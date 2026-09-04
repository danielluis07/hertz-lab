"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useFormState,
  type Control,
  type FieldPathByValue,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatBRL, parseBRL } from "@/lib/utils/format";
import { EMPTY_VARIANT } from "@/modules/products/constants";
import type { ProductFormValues } from "@/modules/products/schemas";

/**
 * The Variants half of the Product form: the sellable units, added and removed
 * as rows of one field array (ADR-0001). Each row carries its own SKU, price,
 * stock and dimensions, because that is what a shopper buys and what a carrier
 * quotes freight on.
 *
 * Removing the last row is allowed, and the section then renders the schema's
 * own refusal. That a Product has at least one Variant is `productSchema`'s
 * rule (`CONTEXT.md`); a disabled button restating it here would be a second
 * copy of it, in a `.tsx`.
 */
export function VariantFields({
  control,
  onVariantRemoved,
}: {
  control: Control<ProductFormValues>;
  /**
   * Fired **before** the row leaves, because the Images name their Variant by
   * its index in this array (ADR-0019) and every index above the removed one
   * is about to mean a different Variant.
   */
  onVariantRemoved: (index: number) => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });
  const { errors } = useFormState({ control, name: "variants" });

  // `min(1)` lands on the array itself rather than on one of its rows. The
  // resolver files it under `root` where rows exist to disambiguate it from
  // theirs, and directly on the array where none do — which is when it fires.
  const variantsError = errors.variants?.root ?? errors.variants;

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <VariantRow
          key={field.id}
          control={control}
          index={index}
          onRemove={() => {
            onVariantRemoved(index);
            remove(index);
          }}
        />
      ))}

      {fields.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma variação. Um produto precisa de ao menos uma para ser vendido.
        </p>
      )}

      <FieldError errors={[variantsError]} />

      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => append(EMPTY_VARIANT)}>
        <PlusIcon data-icon="inline-start" />
        Adicionar variação
      </Button>
    </div>
  );
}

/**
 * One Variant. Split out so the array above reads as an array, and because
 * every field in it is addressed by its index: `variants.3.sku` is the path
 * React Hook Form registers, and the path `create` names back when the SKU it
 * holds is already taken.
 */
function VariantRow({
  control,
  index,
  onRemove,
}: {
  control: Control<ProductFormValues>;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="bg-muted/30 flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Variação {index + 1}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remover variação ${index + 1}`}>
          <Trash2Icon data-icon="inline-start" />
          Remover
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name={`variants.${index}.name`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Nome</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Preto"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={control}
          name={`variants.${index}.sku`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>SKU</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="HL-FONE-001-PT"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyField
          control={control}
          name={`variants.${index}.priceAmount`}
          label="Preço"
        />

        <OptionalMoneyField
          control={control}
          name={`variants.${index}.compareAtPriceAmount`}
          label="Preço comparativo"
          description="O valor riscado ao lado da oferta. Vazio se não houver."
        />

        <IntegerField
          control={control}
          name={`variants.${index}.stockQuantity`}
          label="Estoque"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <IntegerField
          control={control}
          name={`variants.${index}.weightGrams`}
          label="Peso (g)"
        />
        <IntegerField
          control={control}
          name={`variants.${index}.lengthMm`}
          label="Comprimento (mm)"
        />
        <IntegerField
          control={control}
          name={`variants.${index}.widthMm`}
          label="Largura (mm)"
        />
        <IntegerField
          control={control}
          name={`variants.${index}.heightMm`}
          label="Altura (mm)"
        />
      </div>
    </div>
  );
}

/**
 * A price. **The form value is BRL cents** (`CONTEXT.md`) and the box holds
 * what the Admin typed, which is why this input is uncontrolled: feeding the
 * cents back through `formatBRL` on every keystroke would rewrite "12,30" as
 * "12,3" under the cursor. `parseBRL` reads "R$ 1.234,56", "1.234,56" and
 * "1234" alike, so it takes back whatever `formatBRL` rendered on an edit.
 *
 * An unreadable amount becomes `NaN`, which the schema refuses with "Informe o
 * preço." — the same sentence an empty box gets, because to an Admin they are
 * the same mistake.
 */
function MoneyField({
  control,
  name,
  label,
}: {
  control: Control<ProductFormValues>;
  name: FieldPathByValue<ProductFormValues, number>;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            id={field.name}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            defaultValue={field.value ? formatBRL(field.value) : ""}
            onChange={(event) =>
              field.onChange(parseBRL(event.target.value) ?? Number.NaN)
            }
            inputMode="decimal"
            placeholder="R$ 0,00"
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

/** The same field where an empty box is a legitimate answer: null, not zero. */
function OptionalMoneyField({
  control,
  name,
  label,
  description,
}: {
  control: Control<ProductFormValues>;
  name: FieldPathByValue<ProductFormValues, number | null>;
  label: string;
  description: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            id={field.name}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            defaultValue={field.value ? formatBRL(field.value) : ""}
            onChange={(event) => field.onChange(parseBRL(event.target.value))}
            inputMode="decimal"
            placeholder="R$ 0,00"
            aria-invalid={fieldState.invalid}
          />
          <FieldDescription>{description}</FieldDescription>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

/**
 * A whole number — a quantity, grams, millimetres. Controlled, because there
 * is no formatting to fight over. An emptied box yields `NaN` from
 * `valueAsNumber`, which renders as blank and which the schema refuses in
 * pt-BR rather than reading as a zero the Admin never typed.
 */
function IntegerField({
  control,
  name,
  label,
}: {
  control: Control<ProductFormValues>;
  name: FieldPathByValue<ProductFormValues, number>;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            id={field.name}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            type="number"
            min={0}
            step={1}
            value={Number.isNaN(field.value) ? "" : field.value}
            onChange={(event) => field.onChange(event.target.valueAsNumber)}
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
