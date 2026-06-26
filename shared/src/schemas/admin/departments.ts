import { z } from "zod";

import { pageFields } from "../../lib/pagination";

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  shortName: z.string().trim().min(1).max(20),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();

export const departmentsListQuery = z.object({
  ...pageFields,
  search: z.string().trim().min(1).max(100).optional(),
});

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
export type DepartmentsListQuery = z.infer<typeof departmentsListQuery>;
