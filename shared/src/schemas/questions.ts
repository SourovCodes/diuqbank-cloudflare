import { z } from "zod";

import { pageFields } from "../utils/pagination";

const optionalId = z.coerce.number().int().positive().optional();

export const questionsListQuery = z.object({
  ...pageFields,
  departmentId: optionalId,
  courseId: optionalId,
  semesterId: optionalId,
  examTypeId: optionalId,
});

export type QuestionsListQuery = z.infer<typeof questionsListQuery>;
