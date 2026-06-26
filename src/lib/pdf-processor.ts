import type { Bindings } from "../types";

/**
 * Compress a PDF via the external PDF Processor service (Ghostscript "ebook"
 * preset). Used to shrink an upload before sending it to the AI so we spend
 * fewer tokens and stay under the model's inline-request limit.
 *
 * Returns the compressed PDF bytes. Throws a plain `Error` on a non-2xx
 * response (the caller is a Workflow step, which retries / marks the row
 * failed).
 */
export const compressPdf = async (
  env: Bindings,
  pdf: ArrayBuffer,
): Promise<ArrayBuffer> => {
  const form = new FormData();
  form.append(
    "pdf",
    new Blob([pdf], { type: "application/pdf" }),
    "upload.pdf",
  );

  const res = await fetch(`${env.PDF_PROCESSOR_URL}/api/pdfs/compress`, {
    method: "POST",
    headers: { "X-API-Key": env.PDF_PROCESSOR_API_KEY },
    body: form,
  });

  if (!res.ok) {
    let message = `PDF compression failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  return res.arrayBuffer();
};
