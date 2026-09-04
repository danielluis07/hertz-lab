"use client";

import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ImageUpload } from "@/hooks/use-image-upload";
import { IMAGE_CONTENT_TYPES, IMAGE_SPEC_SUMMARY } from "@/lib/utils/image";

/**
 * **The picker every uploaded picture in this app goes through** (ADR-0021):
 * the spec panel, the file input, the tiles of the files still going up, their
 * determinate bars, and the sentence on anything refused or failed.
 *
 * It promoted out of `modules/products/` on the second uploader — a Category
 * picture — which is the gate `docs/MODULES.md` sets: a second module needs it
 * **and** it knows no rule. It knows none. Alt text, the Variant index and the
 * "Capa" badge are Product rules and stay in the products tiles, which this
 * renders as `children`; the mutations that mint and discard a key are a
 * module's too, and reach `useImageUpload` from there.
 *
 * Every decision below was made in `useImageUpload`. This picks a file, shows a
 * preview, draws a bar and offers three buttons; the hook owns what any of that
 * means, because a `.tsx` holds render logic and nothing else
 * (`docs/CONVENTIONS.md`).
 */
export function ImageUploadField({
  id,
  label,
  multiple = false,
  upload,
  children,
}: {
  /** The input's id, so the surface owns the label's `htmlFor`. */
  id: string;
  label: string;
  /** A Product has many photographs; a Category has one picture. */
  multiple?: boolean;
  upload: ImageUpload;
  /** The tiles the calling module already holds, first in the grid. */
  children?: React.ReactNode;
}) {
  const specId = `${id}-spec`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}

        {/* Always after the caller's tiles: a file that is still going up has
            no place in the order until it has a key to hold that place. */}
        {upload.uploads.map((pending) => (
          <ImageTile key={pending.id} src={pending.previewUrl} muted>
            <p className="truncate text-xs" title={pending.fileName}>
              {pending.fileName}
            </p>

            {pending.error ? (
              <>
                {/* The tile owns this failure. The S3 PUT is not a mutation,
                    so the global net never sees it, and a toast is the wrong
                    surface for something with a per-file recovery (ADR-0018). */}
                <p className="text-destructive text-sm">{pending.error}</p>

                <div className="flex flex-wrap gap-2">
                  {/* Always offered: a tile only ever carries a *transfer*
                      failure, and asking again is exactly what fixes one. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => upload.retry(pending.id)}>
                    <RotateCcwIcon data-icon="inline-start" />
                    Tentar novamente
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => upload.cancel(pending.id)}>
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
                  aria-valuenow={Math.round(pending.progress * 100)}
                  aria-label={`Enviando ${pending.fileName}`}
                  className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  {/* Determinate, and inline because the width is the datum. */}
                  <div
                    className="bg-primary h-full transition-[width] duration-150"
                    style={{ width: `${Math.round(pending.progress * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    Enviando… {Math.round(pending.progress * 100)}%
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => upload.cancel(pending.id)}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </ImageTile>
        ))}
      </div>

      {/* A refused file has no tile and no preview — it was never sent
          (ADR-0021) — so its sentence is a row of its own, naming the file it
          is about and nothing else on the form. */}
      {upload.refusals.length > 0 && (
        <ul className="flex flex-col gap-2">
          {upload.refusals.map((refusal) => (
            <li
              key={refusal.id}
              className="border-destructive/40 bg-destructive/5 flex items-start justify-between gap-3 rounded-lg border p-3">
              {/* `role="alert"` on the sentence itself, rather than a live
                  region around the list: a live region is announced only for
                  what is added to a region that was already there, and this
                  list is not — it appears with its first refusal. An alert is
                  the role for a message inserted after the fact, which is what
                  this is, and it stays off the `li` so the list keeps its own
                  semantics. Focus is still in the picker when the sentence
                  lands somewhere else on the page. */}
              <p role="alert" className="text-sm">
                <span className="font-medium">{refusal.fileName}</span>{" "}
                <span className="text-destructive">{refusal.message}</span>
              </p>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => upload.dismiss(refusal.id)}>
                Dispensar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>

        {/* **Before the mistake, not only after it** (ADR-0021). It is wired to
            the input rather than left floating above it, so an Admin who
            reaches the picker by keyboard hears the spec as they arrive. */}
        <p
          id={specId}
          className="bg-muted/30 text-muted-foreground rounded-md border p-3 text-sm">
          {IMAGE_SPEC_SUMMARY}
        </p>

        <Input
          id={id}
          type="file"
          multiple={multiple}
          accept={IMAGE_CONTENT_TYPES.join(",")}
          aria-describedby={specId}
          onChange={(event) => {
            upload.select(Array.from(event.target.files ?? []));
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
 * One tile in the grid, whatever it holds: a picture the caller has saved, or a
 * file still on its way to becoming one. Shared so that the two never drift
 * into two shapes side by side on the same form.
 */
export function ImageTile({
  src,
  muted,
  badge,
  children,
}: {
  src: string;
  /** Dimmed while the bytes are still moving. */
  muted?: boolean;
  /** Anything the caller overlays on the picture — the "Capa" badge. */
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
      <div className="relative">
        {/* A plain `img`: the source is either a `blob:` URL, which the
            optimizer cannot fetch, or a bucket object shown at thumbnail size
            on a page only an Admin opens — neither is a job for `next/image`.
            The asset host is in `remotePatterns` now that the shop renders
            through the optimizer (ADR-0021), which changes nothing here.

            `alt=""` because it is decorative *here*: whatever the tile holds is
            named by the fields beside it, and reading a filename aloud would
            announce something the shopper will never hear. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={`bg-background aspect-square w-full rounded-md border object-cover${
            muted ? " opacity-60" : ""
          }`}
        />

        {badge}
      </div>

      {children}
    </div>
  );
}
