"use client";

/**
 * PROTOTYPE — `modules/products/admin/components/product-image-upload.tsx`.
 *
 * Stubbed, but the flow is the real one and it is the form's one genuine
 * complication.
 *
 * ADR-0012 has **no Server Actions**, so a file cannot ride along with the
 * submit. It goes to S3 directly against a presigned URL obtained from a
 * procedure, *before* the form is saved, and the form only ever carries the
 * resulting key — which is also what `brand.logoS3Key` and `product_image`
 * store: "an S3 object key, never a URL".
 *
 * The consequence, recorded rather than solved: an Admin who uploads and then
 * abandons the form leaves an **orphaned S3 object**. Nothing in this sketch
 * cleans it up, and nothing in the map has decided who does.
 */

import { useFieldArray, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductFormValues } from "./schema";

export function ImageUpload({
  control,
}: {
  control: Control<ProductFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "images",
  });

  const fakeUpload = () => {
    // Real flow: `trpc.products.admin.presignUpload.mutate({ contentType })`
    // -> PUT the File to `url` -> append the returned `s3Key`.
    append({ s3Key: `products/new/${crypto.randomUUID()}.jpg`, altText: "" });
  };

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <span className="inline-block size-10 shrink-0 rounded bg-muted" />
          <code className="truncate text-xs text-muted-foreground">
            {control._formValues.images?.[index]?.s3Key}
          </code>
          <Input placeholder="Texto alternativo (pt-BR)" className="max-w-xs" />
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
        <Button type="button" variant="outline" size="sm" onClick={fakeUpload}>
          Enviar imagem (stub)
        </Button>
      </div>
    </div>
  );
}
