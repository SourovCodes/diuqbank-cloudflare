import { z } from "zod";

import { pageFields } from "../lib/pagination";

export const autoUploadsListQuery = z.object({
  ...pageFields,
});

// Optional free-text hint the uploader supplies to steer a re-extraction.
export const autoUploadReprocessSchema = z.object({
  extraContext: z.string().trim().max(1000).optional(),
});

export type AutoUploadReprocessInput = z.infer<typeof autoUploadReprocessSchema>;
