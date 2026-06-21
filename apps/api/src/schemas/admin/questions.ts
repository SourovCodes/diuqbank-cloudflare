import { z } from "zod";

const id = z.number().int().positive();

export const questionCreateSchema = z.object({
  departmentId: id,
  courseId: id,
  semesterId: id,
  examTypeId: id,
});

export const questionUpdateSchema = questionCreateSchema.partial();

export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;
