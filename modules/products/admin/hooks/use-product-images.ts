"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import { useCreateImageUpload } from "@/modules/products/admin/hooks/use-create-image-upload";
import { useDiscardImageUpload } from "@/modules/products/admin/hooks/use-discard-image-upload";
import { putWithProgress } from "@/modules/products/admin/upload";
import {
  checkImageUpload,
  type ProductFormValues,
} from "@/modules/products/schemas";

/**
 * The images half of the Product form, as state (ADR-0018): the array React
 * Hook Form holds, plus the files that are still on their way to it.
 *
 * **It is a hook and not a component** because it is nothing but rule and
 * sequence — pick, check, presign, PUT, append — and a `.tsx` may hold only
 * render logic (`docs/CONVENTIONS.md`). It is called by `product-form.tsx`
 * rather than by the field group it feeds, because the *submit button* is the
 * other consumer: submit is blocked while anything is in flight, and the
 * button lives one component above the tiles.
 *
 * **A file becomes a form value only once its bytes are in the bucket.** Until
 * then it is a tile with a preview and a bar, held here; if it fails it stays
 * here with its own error and its own retry, and the form never learns about
 * it. That is what keeps `images` a list of keys that certainly exist, and
 * what keeps a failed upload out of the aggregate that gets saved.
 */

/** A file on its way up, or one that did not make it. Never a form value. */
export type PendingUpload = {
  /** Local to this session. A tile with no key has no id worth keeping. */
  id: string;
  fileName: string;
  /** `URL.createObjectURL`, so the Admin sees the photograph immediately. */
  previewUrl: string;
  /** 0 to 1, from `XMLHttpRequest`; determinate on purpose. */
  progress: number;
  /** The pt-BR sentence the tile renders, or null while it is still going. */
  error: string | null;
  /**
   * A file the browser refused for its type or its size cannot be retried
   * into acceptance — only a transfer that failed can.
   */
  retryable: boolean;
};

/** What the hook holds per pending tile and the render never needs. */
type UploadJob = {
  file: File;
  previewUrl: string;
  /** Set once `createImageUpload` has answered; what `cancel` discards. */
  key?: string;
  controller: AbortController;
};

/** The sentence a failed transfer renders on its own tile — never a toast. */
const UPLOAD_FAILED_MESSAGE = "Não foi possível enviar esta imagem.";

export function useProductImages({
  control,
}: {
  control: Control<ProductFormValues>;
}) {
  /**
   * `keyName` is not decoration. `useFieldArray` writes React's key onto the
   * field object as `id`, which is the name this array already uses for the
   * `product_image` row's id — the thing that says whether an Image has been
   * persisted (ADR-0019). Renaming React's key is what keeps ours readable.
   */
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images",
    keyName: "tileId",
  });

  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const jobs = useRef(new Map<string, UploadJob>());

  const createUpload = useCreateImageUpload();
  const discardUpload = useDiscardImageUpload();

  // The previews are object URLs, and a form the Admin navigated away from
  // still holds their blobs until something lets them go.
  useEffect(() => {
    const opened = jobs.current;

    return () => {
      for (const job of opened.values()) URL.revokeObjectURL(job.previewUrl);
      opened.clear();
    };
  }, []);

  const patch = (id: string, changes: Partial<PendingUpload>) =>
    setUploads((current) =>
      current.map((upload) =>
        upload.id === id ? { ...upload, ...changes } : upload,
      ),
    );

  const forget = (id: string) => {
    const job = jobs.current.get(id);

    if (job) {
      URL.revokeObjectURL(job.previewUrl);
      jobs.current.delete(id);
    }

    setUploads((current) => current.filter((upload) => upload.id !== id));
  };

  /**
   * Presign, PUT, and hand the key to the form. The `catch` is deliberately
   * one arm: whether the mint or the transfer failed, what the Admin can do
   * about it is the same, and the tile says so on itself.
   */
  const send = async (id: string) => {
    const job = jobs.current.get(id);
    if (!job) return;

    patch(id, { progress: 0, error: null, retryable: false });

    // The client half of ADR-0018's split validation: immediate, in pt-BR, and
    // the same sentence the procedure would have refused with. Not retryable —
    // a file is the type and the size it is, and asking again cannot help.
    const checked = checkImageUpload(job.file);

    if (!checked.accepted) {
      patch(id, { error: checked.message, retryable: false });
      return;
    }

    try {
      const { key, url } = await createUpload.mutateAsync(checked.upload);

      job.key = key;

      await putWithProgress(
        url,
        job.file,
        (progress) => patch(id, { progress }),
        job.controller.signal,
      );

      // Only now is it a form value: a key in the array is a key in the
      // bucket, on create and update alike.
      append({ s3Key: key, altText: "", variantId: null });
      forget(id);
    } catch {
      // A tile the Admin cancelled is already gone, and `patch` then finds
      // nothing to write to — which is why an abort needs no branch here.
      patch(id, { error: UPLOAD_FAILED_MESSAGE, retryable: true });
    }
  };

  /**
   * Everything the Admin just picked. Every file becomes a tile immediately,
   * with its own preview — including one that will be refused, which is how
   * the Admin sees *which* photograph the sentence is about.
   */
  const select = (files: readonly File[]) => {
    for (const file of files) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      jobs.current.set(id, {
        file,
        previewUrl,
        controller: new AbortController(),
      });

      setUploads((current) => [
        ...current,
        {
          id,
          fileName: file.name,
          previewUrl,
          progress: 0,
          error: null,
          retryable: false,
        },
      ]);

      void send(id);
    }
  };

  /** One file again, not the whole selection — the per-tile recovery. */
  const retry = (id: string) => {
    const job = jobs.current.get(id);
    if (!job) return;

    // A spent controller aborts the retry the moment it starts.
    job.controller = new AbortController();
    void send(id);
  };

  /** Give up on a pending tile: stop the transfer, throw away what reached S3. */
  const cancel = (id: string) => {
    const job = jobs.current.get(id);

    job?.controller.abort();
    if (job?.key) discardUpload.mutate({ key: job.key });

    forget(id);
  };

  /**
   * Remove an Image the form already holds. **A field edit, not a confirmed
   * write** (ADR-0018): it is undone by adding the file back, and confirming
   * it would mean confirming every array row on this form.
   *
   * A key that was never persisted takes its object with it now — that orphan
   * is the one we can see. A persisted row's object dies with the `update`
   * that writes an array no longer holding its key: irreversible, but
   * irreversible at submit, which is the act the Admin performs deliberately.
   */
  const removeImage = (index: number) => {
    const image = fields[index];

    remove(index);

    if (image && !image.id) discardUpload.mutate({ key: image.s3Key });
  };

  return {
    /** The Images the form holds, in the order the shop will render them. */
    fields,
    uploads,
    /** What disables submit, and what the sentence beside it is about. */
    isUploading: uploads.some((upload) => upload.error === null),
    select,
    retry,
    cancel,
    removeImage,
    /** Reordering is a client-side array move; `position` is derived on save. */
    move,
  };
}

/** One prop rather than nine, for the field group this hook feeds. */
export type ProductImages = ReturnType<typeof useProductImages>;
