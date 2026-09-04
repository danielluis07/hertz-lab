"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
} from "react-hook-form";
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
import { IMAGE_CONTENT_TYPES } from "@/lib/utils/image";
import { s3KeyToUrl } from "@/lib/utils/url";
import type { ProductImages } from "@/modules/products/admin/hooks/use-product-images";
import type { ProductFormValues } from "@/modules/products/schemas";

/**
 * The photographs, as tiles (ADR-0018). Two kinds sit side by side: an Image
 * the form holds — its file is in the bucket and its key is a form value — and
 * a file still on its way, which is not a form value and never will be unless
 * it arrives.
 *
 * **Every decision here was made in `useProductImages`.** This file picks a
 * file, shows a preview, draws a bar and offers three buttons; the hook owns
 * what any of that means, because a `.tsx` holds render logic and nothing else
 * (`docs/CONVENTIONS.md`).
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
      {images.fields.length === 0 && images.uploads.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma imagem. A primeira da lista é a que aparece na vitrine.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.fields.map((field, index) => (
          <ImageTile
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

        {/* Always after the saved tiles: a file that is still going up has no
            place in the order until it has a key to hold that place. */}
        {images.uploads.map((upload) => (
          <div
            key={upload.id}
            className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
            <ImagePreview src={upload.previewUrl} muted />

            <p className="truncate text-xs" title={upload.fileName}>
              {upload.fileName}
            </p>

            {upload.error ? (
              <>
                {/* The tile owns this failure. The S3 PUT is not a mutation,
                    so the global net never sees it, and a toast is the wrong
                    surface for something with a per-file recovery (ADR-0018). */}
                <p className="text-destructive text-sm">{upload.error}</p>

                <div className="flex flex-wrap gap-2">
                  {upload.retryable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => images.retry(upload.id)}>
                      <RotateCcwIcon data-icon="inline-start" />
                      Tentar novamente
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => images.cancel(upload.id)}>
                    Remover
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(upload.progress * 100)}
                  aria-label={`Enviando ${upload.fileName}`}
                  className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  {/* Determinate, and inline because the width is the datum. */}
                  <div
                    className="bg-primary h-full transition-[width] duration-150"
                    style={{ width: `${Math.round(upload.progress * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    Enviando… {Math.round(upload.progress * 100)}%
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => images.cancel(upload.id)}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Field>
        <FieldLabel htmlFor="product-images">Adicionar imagens</FieldLabel>
        <Input
          id="product-images"
          type="file"
          multiple
          accept={IMAGE_CONTENT_TYPES.join(",")}
          onChange={(event) => {
            images.select(Array.from(event.target.files ?? []));
            // The same photograph, picked again after it was removed, is a
            // change the input would not report otherwise.
            event.target.value = "";
          }}
        />
      </Field>
    </div>
  );
}

/**
 * One Image the form holds: the photograph, the alt text a screen reader will
 * read, and which Variant it shows.
 */
function ImageTile({
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
    <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
      <div className="relative">
        <ImagePreview src={s3KeyToUrl(s3Key)} />

        {index === 0 && (
          <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium">
            Capa
          </span>
        )}
      </div>

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
    </div>
  );
}

/**
 * The photograph itself. A plain `img`: the source is either a `blob:` URL,
 * which the optimizer cannot fetch, or a bucket object shown at thumbnail size
 * on a page only an Admin opens — neither is a job for `next/image`, and the
 * asset host is not in `remotePatterns` for exactly that reason.
 *
 * `alt=""` because it is decorative *here*: the field below it is where the
 * Admin writes what the photograph shows, and reading a filename aloud would
 * announce something the shopper will never hear.
 */
function ImagePreview({ src, muted }: { src: string; muted?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`bg-background aspect-square w-full rounded-md border object-cover${
        muted ? " opacity-60" : ""
      }`}
    />
  );
}
