"use client";

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
} from "react-hook-form";
import { ImageTile, ImageUploadField } from "@/components/image-upload-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { s3KeyToUrl } from "@/lib/utils/url";
import type { ProductImages } from "@/modules/products/admin/hooks/use-product-images";
import type { ProductFormValues } from "@/modules/products/schemas";

/**
 * The photographs, as tiles (ADR-0018). Two kinds sit side by side: an Image
 * the form holds — its file is in the bucket and its key is a form value — and
 * a file still on its way, which is not a form value and never will be unless
 * it arrives.
 *
 * **The picker, the spec panel and the pending tiles are not here.** They are
 * `components/image-upload-field.tsx`, shared with the Category uploader
 * (ADR-0021); what this file keeps is what is a rule about a Product — the alt
 * text a screen reader will read, the Variant an Image shows, and the "Capa"
 * badge on the first of them. The saved tiles are handed to the field as
 * children, so both kinds sit in one grid.
 *
 * The order of the tiles is the order the shop renders: `position` is derived
 * from the array index at write time and is never sent, so arranging is a
 * client-side move saved by the same submit as the rest of the form.
 */
export function ImageFields({
  control,
  images,
}: {
  control: Control<ProductFormValues>;
  images: ProductImages;
}) {
  // The picker has to name the Variants as the Admin has just typed them, so
  // it watches them. `useWatch` rather than `form.watch()`, and in this leaf
  // rather than in the form body: a keystroke in a SKU redraws the tiles and
  // not the whole page.
  const variants = useWatch({ control, name: "variants" });
  const variantLabels = variants.map(
    (variant, index) => variant.name || `Variação ${index + 1}`,
  );

  return (
    <div className="flex flex-col gap-4">
      {images.fields.length === 0 && images.upload.uploads.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma imagem. A primeira da lista é a que aparece na vitrine.
        </p>
      )}

      <ImageUploadField
        id="product-images"
        label="Adicionar imagens"
        multiple
        upload={images.upload}>
        {images.fields.map((field, index) => (
          <ProductImageTile
            key={field.tileId}
            control={control}
            index={index}
            s3Key={field.s3Key}
            variantLabels={variantLabels}
            isLast={index === images.fields.length - 1}
            onMoveUp={() => images.move(index, index - 1)}
            onMoveDown={() => images.move(index, index + 1)}
            onRemove={() => images.removeImage(index)}
          />
        ))}
      </ImageUploadField>
    </div>
  );
}

/**
 * One Image the form holds: the photograph, the alt text a screen reader will
 * read, and which Variant it shows. The tile itself is the shared one; what is
 * inside it is everything a Category picture does not have.
 */
function ProductImageTile({
  control,
  index,
  s3Key,
  variantLabels,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  control: Control<ProductFormValues>;
  index: number;
  s3Key: string;
  variantLabels: string[];
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  // Where a write's refusal lands: `create` and `update` `stat` every key and
  // name the tile whose object is missing or oversized, so the sentence
  // arrives on the photograph it is about (ADR-0013).
  const { errors } = useFormState({ control, name: `images.${index}.s3Key` });

  return (
    <ImageTile
      src={s3KeyToUrl(s3Key)}
      badge={
        // A position and never a flag (`CONTEXT.md`): the first Image *is* the
        // Cover, which is why reordering is what changes it.
        index === 0 && (
          <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium">
            Capa
          </span>
        )
      }>
      <FieldError errors={[errors.images?.[index]?.s3Key]} />

      <Controller
        control={control}
        name={`images.${index}.altText`}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Texto alternativo</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="Fone preto visto de lado"
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={control}
        name={`images.${index}.variantId`}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Aparece em</FieldLabel>
            {/* The value is an **index into the variants array**, never a
                database id (ADR-0019), and null is what the nullable column
                already means: a shot of the Product as a whole. */}
            <Select
              value={field.value === null ? "product" : String(field.value)}
              onValueChange={(next: string | null) =>
                field.onChange(
                  next === null || next === "product" ? null : Number(next),
                )
              }>
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue>
                  {(selected: string | null) =>
                    selected === null || selected === "product"
                      ? "O produto todo"
                      : (variantLabels[Number(selected)] ?? "O produto todo")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">O produto todo</SelectItem>
                {variantLabels.map((label, variantIndex) => (
                  <SelectItem key={variantIndex} value={String(variantIndex)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            onClick={onMoveUp}
            aria-label={`Mover imagem ${index + 1} para antes`}>
            <ArrowUpIcon />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label={`Mover imagem ${index + 1} para depois`}>
            <ArrowDownIcon />
          </Button>
        </div>

        {/* No confirmation: removing a tile is a field edit, undone by adding
            the file back (ADR-0018). */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remover imagem ${index + 1}`}>
          <Trash2Icon data-icon="inline-start" />
          Remover
        </Button>
      </div>
    </ImageTile>
  );
}
