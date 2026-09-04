import "client-only";

/**
 * **The two things an image upload needs from the browser**, and the reason
 * this file is not `lib/utils/image.ts`: `lib/utils/*` are isomorphic and mark
 * nothing (`docs/CONVENTIONS.md`), while `XMLHttpRequest` and
 * `createImageBitmap` are browser APIs. Everything that can be judged without
 * one stayed there; what is left is here, impure and client-only (ADR-0021).
 *
 * It is global rather than a module's, because there are two uploaders — a
 * Product photograph and a Category picture — and neither of these functions
 * knows which one it is serving. `import "client-only"` states the boundary
 * the way `import "server-only"` states the other side's.
 */

/**
 * **The real dimensions of a picked file.** The only impure step in the
 * geometry gate: it reads the numbers, and `checkImageDimensions` — pure,
 * isomorphic, tested — decides what they mean (ADR-0017, ADR-0021).
 *
 * `createImageBitmap` decodes off the main thread and answers for every format
 * this app accepts, AVIF included, which is what an `<img>` and an object URL
 * would also have done at the cost of a load/error dance and a URL to revoke.
 * The bitmap is closed as soon as its two numbers are read: it is a decoded
 * surface, and a batch of six 4000 × 4000 photographs held open is 384 MB.
 *
 * **It returns `null` rather than throwing** for a file that will not decode —
 * a `.png` that is not one, a truncated download. That is a refusal like any
 * other and the caller renders a sentence for it, so there is nothing here for
 * a `try` to add.
 */
export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);

    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

/**
 * The one thing `fetch` cannot do: report how much of a file has gone up.
 * Bytes-sent is exposed only through `XMLHttpRequest`, so a determinate
 * progress bar is a choice of transport rather than a choice of component
 * (ADR-0018) — and a product photograph over a Brazilian connection is the
 * reason the bar has to be determinate.
 *
 * The rejection carries a technical message and never reaches a user: the
 * tile that raised it renders its own pt-BR sentence, because a failed upload
 * is not a mutation and the global net never sees it (ADR-0013).
 */
export type UploadProgress = (fraction: number) => void;

export function putWithProgress(
  url: string,
  file: File,
  onProgress: UploadProgress,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", url);
    // What the stored object's type becomes. It is *not* a guard: a
    // query-signed PUT does not carry Content-Type among its signed headers,
    // so S3 accepts a mismatched one — which is why the write `stat`s the
    // object rather than trusting the URL it minted (ADR-0018).
    request.setRequestHeader("Content-Type", file.type);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        // The last progress event fires before the response arrives, and a bar
        // resting at 98% while the tile settles reads as a stall.
        onProgress(1);
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${request.status}`));
    };

    request.onerror = () => reject(new Error("Upload failed"));
    request.onabort = () => reject(new Error("Upload aborted"));

    // An abort that already happened fires no event to listen for, and the
    // window it lands in is real: a tile cancelled while its presign is still
    // in flight aborts a signal nothing is listening to yet. Without this the
    // file would upload anyway and its key would join the form.
    if (signal?.aborted) {
      reject(new Error("Upload aborted"));
      return;
    }

    signal?.addEventListener("abort", () => request.abort(), { once: true });

    request.send(file);
  });
}
