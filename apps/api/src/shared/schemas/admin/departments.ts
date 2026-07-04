import { z } from "zod";

import { pageFields } from "../../utils/pagination";
import { taxonomyName } from "../taxonomy-name";

export const departmentCreateSchema = z.object({
  name: taxonomyName(100),
  shortName: taxonomyName(20),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();

export const departmentsListQuery = z.object({
  ...pageFields,
  search: z.string().trim().min(1).max(100).optional(),
});

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
export type DepartmentsListQuery = z.infer<typeof departmentsListQuery>;
