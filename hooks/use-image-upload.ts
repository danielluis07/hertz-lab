"use client";

import { useEffect, useRef, useState } from "react";
import { putWithProgress, readImageDimensions } from "@/lib/upload";
import {
  checkImageDimensions,
  checkImageUpload,
  type ImageUploadInput,
} from "@/lib/utils/image";

/**
 * **Files on their way to the bucket**, for any surface that uploads a picture
 * (ADR-0021): pick, check, presign, PUT, progress, cancel, retry, discard.
 *
 * It is a hook and not a component because it is nothing but rule and sequence,
 * which a `.tsx` may not hold (`docs/CONVENTIONS.md`), and it is global because
 * a Category picture is the second uploader — the promotion trigger ADR-0007
 * asks for. **It knows no Product rule.** Alt text, the Variant index and the
 * "Capa" badge belong to whoever calls it; what arrives here is a `File`, and
 * what leaves is a key.
 *
 * **The two mutations are props**, because they are the half that does not
 * promote (ADR-0021): `createImageUpload` mints a prefix — `products/…`,
 * `categories/…` — and `discardImageUpload` guards its own table. Each module
 * keeps its own pair and hands them in, which is also why nothing here imports
 * a module.
 *
 * **A file becomes a key only once its bytes are in the bucket.** Until then it
 * is a tile with a preview and a bar, held here; if its transfer fails it stays
 * here with its own error and its own retry, and `onUploaded` is never called
 * for it. That is what keeps the caller's list a list of keys that certainly
 * exist (ADR-0018).
 */

/** A file on its way up, or one whose transfer failed. Never a key yet. */
export type PendingUpload = {
  /** Local to this session. A tile with no key has no id worth keeping. */
  id: string;
  fileName: string;
  /** `URL.createObjectURL`, so the Admin sees the photograph immediately. */
  previewUrl: string;
  /** 0 to 1, from `XMLHttpRequest`; determinate on purpose. */
  progress: number;
  /**
   * The pt-BR sentence the tile renders, or null while it is still going. It
   * is always a *transfer* that failed, and therefore always retryable: a file
   * refused for what it is never became a tile (see `refusals`).
   */
  error: string | null;
};

/**
 * **A file that was never sent.** Wrong type, over the byte cap, or the wrong
 * shape — judged at pick time, so it costs no upload and leaves no tile behind
 * (ADR-0021). It carries its own name, because the sentence has to say which of
 * six photographs it is about, and no preview: a refusal has nothing to look at
 * and holding a blob for it is a leak with a "Remover" button on it.
 */
export type RefusedFile = {
  id: string;
  fileName: string;
  /** Exactly one pt-BR sentence, naming what the file actually was. */
  message: string;
};

/** What the hook holds per pending tile and the render never needs. */
type UploadJob = {
  file: File;
  previewUrl: string;
  /** What `createImageUpload` takes, judged once at pick time. */
  upload: ImageUploadInput;
  /** Set once `createImageUpload` has answered; what `cancel` discards. */
  key?: string;
  controller: AbortController;
};

/**
 * What this needs of `createImageUpload`: one presigned PUT and the key the
 * object will live under. A structural type rather than the mutation's own, so
 * the global layer describes the shape it uses and imports no module (ADR-0007).
 */
export type CreateUploadMutation = {
  mutateAsync: (
    input: ImageUploadInput,
  ) => Promise<{ key: string; url: string }>;
};

/** What it needs of `discardImageUpload`: one key thrown away, fire and forget. */
export type DiscardUploadMutation = {
  mutate: (input: { key: string }) => void;
};

/** The sentence a failed transfer renders on its own tile — never a toast. */
const UPLOAD_FAILED_MESSAGE = "Não foi possível enviar esta imagem.";

/**
 * A file whose bytes are not the picture its type claims. Refused with the
 * others, because from the Admin's side it is the same act: pick another file.
 */
const UNREADABLE_MESSAGE = "Não foi possível ler esta imagem.";

export function useImageUpload({
  createUpload,
  discardUpload,
  onUploaded,
}: {
  createUpload: CreateUploadMutation;
  discardUpload: DiscardUploadMutation;
  /** Called once per file that arrived, with the key it arrived under. */
  onUploaded: (key: string) => void;
}) {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [refusals, setRefusals] = useState<RefusedFile[]>([]);
  /**
   * Files being judged: picked, but not yet a tile or a refusal. It is a
   * handful of milliseconds and it is still a window — the decode is async, and
   * submit must not slip through it (`isUploading` below).
   */
  const [judging, setJudging] = useState(0);
  const jobs = useRef(new Map<string, UploadJob>());

  // The previews are object URLs, and a form the Admin navigated away from
  // still holds their blobs until something lets them go. The transfers stop
  // with them: an upload nobody is waiting for is bandwidth spent on a form
  // that no longer exists, and what it leaves in the bucket is the orphan an
  // abandoned form was always going to leave (ADR-0018).
  useEffect(() => {
    const opened = jobs.current;

    return () => {
      for (const job of opened.values()) {
        job.controller.abort();
        URL.revokeObjectURL(job.previewUrl);
      }

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
   * Presign, PUT, and hand the key over. The `catch` is deliberately one arm:
   * whether the mint or the transfer failed, what the Admin can do about it is
   * the same, and the tile says so on itself.
   */
  const send = async (id: string) => {
    const job = jobs.current.get(id);
    if (!job) return;

    patch(id, { progress: 0, error: null });

    try {
      const { key, url } = await createUpload.mutateAsync(job.upload);

      job.key = key;

      await putWithProgress(
        url,
        job.file,
        (progress) => patch(id, { progress }),
        job.controller.signal,
      );

      // The tile may have been cancelled, or the form unmounted, while the
      // bytes were moving. `forget` and the unmount both drop the job, so its
      // absence is the question to ask — and the object goes back where a
      // cancelled one goes.
      if (!jobs.current.has(id)) {
        discardUpload.mutate({ key });
        return;
      }

      // Only now is it a key: one in the caller's list is one in the bucket.
      onUploaded(key);
      forget(id);
    } catch {
      // A PUT can fail after S3 has stored the object, and a retry mints a
      // second key — so the first is thrown away here rather than left as an
      // orphan nobody could have seen (ADR-0018). `cancel` clears the key it
      // has already discarded, so this never runs twice on one object.
      if (job.key) {
        discardUpload.mutate({ key: job.key });
        job.key = undefined;
      }

      // A tile the Admin cancelled is already gone, and `patch` then finds
      // nothing to write to — which is why an abort needs no branch here.
      patch(id, { error: UPLOAD_FAILED_MESSAGE });
    }
  };

  const refuse = (file: File, message: string) =>
    setRefusals((current) => [
      ...current,
      { id: crypto.randomUUID(), fileName: file.name, message },
    ]);

  /**
   * **The gate, in the order the checks cost** (ADR-0021): type, then bytes,
   * then pixels. `checkImageUpload` is the type and the byte cap, so an
   * enormous file is refused before anything decodes it; only what survives
   * that is handed to the browser to be read, and only what the browser could
   * read is measured against the geometry rule.
   *
   * Every refusal returns here, which is what makes "one file, one reason,
   * no tile, no bytes" a property of this function rather than of its callers.
   */
  const admit = async (file: File) => {
    setJudging((count) => count + 1);

    // Whatever this file turns out to be — a refusal, or a tile — the window
    // closes in the same update as the thing that replaces it, so `isUploading`
    // never dips between the two.
    try {
      const checked = checkImageUpload(file);

      if (!checked.accepted) {
        refuse(file, checked.message);
        return;
      }

      const dimensions = await readImageDimensions(file);

      if (!dimensions) {
        refuse(file, UNREADABLE_MESSAGE);
        return;
      }

      const geometry = checkImageDimensions(dimensions);

      if (!geometry.accepted) {
        refuse(file, geometry.message);
        return;
      }

      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      jobs.current.set(id, {
        file,
        previewUrl,
        upload: checked.upload,
        controller: new AbortController(),
      });

      setUploads((current) => [
        ...current,
        { id, fileName: file.name, previewUrl, progress: 0, error: null },
      ]);

      void send(id);
    } finally {
      setJudging((count) => count - 1);
    }
  };

  /**
   * Everything the Admin just picked. **Each file is judged on its own** — one
   * refusal says nothing about the file beside it, and the accepted ones go up
   * while the refused one is being read.
   */
  const select = (files: readonly File[]) => {
    for (const file of files) void admit(file);
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

    if (job?.key) {
      discardUpload.mutate({ key: job.key });
      // Cleared, so the rejection this abort is about to raise does not
      // discard the same object a second time.
      job.key = undefined;
    }

    forget(id);
  };

  /** Acknowledge a refusal. Nothing to undo: the file was never sent. */
  const dismiss = (id: string) =>
    setRefusals((current) => current.filter((refusal) => refusal.id !== id));

  return {
    uploads,
    refusals,
    /**
     * What disables submit, and what the sentence beside it is about. A file
     * still being judged counts: it has no tile yet, and saving in that window
     * would be saving without the photograph that is about to arrive.
     */
    isUploading: judging > 0 || uploads.some((upload) => upload.error === null),
    select,
    retry,
    cancel,
    dismiss,
  };
}

/** One prop rather than seven, for the field this hook feeds. */
export type ImageUpload = ReturnType<typeof useImageUpload>;
