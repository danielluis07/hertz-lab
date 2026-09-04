/**
 * The one thing `fetch` cannot do: report how much of a file has gone up.
 * Bytes-sent is exposed only through `XMLHttpRequest`, so a determinate
 * progress bar is a choice of transport rather than a choice of component
 * (ADR-0018) — and a product photograph over a Brazilian connection is the
 * reason the bar has to be determinate.
 *
 * **Browser-only, and deliberately not in `lib/`.** It knows no rule, so
 * ADR-0007 would allow promoting it — on the *second* uploader, which is
 * `brand.logoS3Key` and is not built. It lives beside the form that needs it
 * until then.
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

    signal?.addEventListener("abort", () => request.abort(), { once: true });

    request.send(file);
  });
}
