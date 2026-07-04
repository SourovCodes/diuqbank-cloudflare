import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

import { MAX_PDF_BYTES, PDF_MIME_TYPE } from "@diuqbank/shared";
import type { AppEnv } from "../types";

const MAX_MULTIPART_OVERHEAD_BYTES = 256 * 1024;

export type ParsedPdf = {
  buffer: ArrayBuffer;
  contentType: typeof PDF_MIME_TYPE;
  ext: "pdf";
};

export const pdfUploadBodyLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const size = Number(c.req.header("content-length") ?? 0);
  // ponytail: Content-Length catches normal oversized uploads before parseBody buffers them.
  if (Number.isFinite(size) && size > MAX_PDF_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    throw new HTTPException(413, {
      message: `multipart upload exceeds limit of ${MAX_PDF_BYTES} bytes`,
    });
  }
  await next();
};

/**
 * Assert a buffer is a PDF by its magic bytes (`%PDF`), not a caller-supplied
 * content-type. Throws a 400 otherwise. Shared by multipart uploads and the
 * legacy bulk import (which downloads PDFs by URL).
 */
export const assertPdfBuffer = (buffer: ArrayBuffer): void => {
  const head = new Uint8Array(buffer.slice(0, 5));
  // "%PDF" → 0x25 0x50 0x44 0x46
  const isPdf =
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  if (!isPdf) {
    throw new HTTPException(400, { message: "file must be a PDF" });
  }
};

/**
 * Validate a multipart `pdf` field. Checks the magic bytes (`%PDF`), not the
 * client-supplied content-type / filename. Takes the already-extracted form
 * value so the caller can read the rest of the multipart body in the same pass.
 */
export const parsePdfFile = async (file: unknown): Promise<ParsedPdf> => {
  if (!(file instanceof File)) {
    throw new HTTPException(400, {
      message: 'pdf file is required (multipart field name: "pdf")',
    });
  }
  if (file.size === 0) {
    throw new HTTPException(400, { message: "pdf file is empty" });
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new HTTPException(413, {
      message: `pdf exceeds limit of ${MAX_PDF_BYTES} bytes`,
    });
  }
  const buffer = await file.arrayBuffer();
  assertPdfBuffer(buffer);
  return { buffer, contentType: PDF_MIME_TYPE, ext: "pdf" };
};
