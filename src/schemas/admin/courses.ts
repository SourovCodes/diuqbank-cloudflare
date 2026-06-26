import { z } from "zod";

import { pageFields } from "../../lib/pagination";

export const courseCreateSchema = z.object({
  departmentId: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
});

export const courseUpdateSchema = courseCreateSchema.partial();

export const coursesListQuery = z.object({
  ...pageFields,
  departmentId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(150).optional(),
});

export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;
export type CoursesListQuery = z.infer<typeof coursesListQuery>;
