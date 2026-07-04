import { z } from "zod";

import { pageFields } from "../../utils/pagination";
import { taxonomyName } from "../taxonomy-name";

export const examTypeCreateSchema = z.object({
  name: taxonomyName(100),
});

export const examTypeUpdateSchema = examTypeCreateSchema.partial();

export const examTypesListQuery = z.object({
  ...pageFields,
  search: z.string().trim().min(1).max(100).optional(),
});

export type ExamTypeCreateInput = z.infer<typeof examTypeCreateSchema>;
export type ExamTypeUpdateInput = z.infer<typeof examTypeUpdateSchema>;
export type ExamTypesListQuery = z.infer<typeof examTypesListQuery>;
