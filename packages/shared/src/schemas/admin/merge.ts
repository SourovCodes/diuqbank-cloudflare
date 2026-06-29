import { z } from "zod";

/**
 * Request body shared by all four category-merge endpoints
 * (`POST /admin/{departments|courses|semesters|exam-types}/merge`).
 *
 * `keepId` is the survivor; every entity in `mergeIds` is folded into it and
 * then deleted. `dryRun` asks the endpoint to compute and return the impact
 * (questions combined, submissions moved, …) without writing anything.
 */
export const mergeSchema = z
  .object({
    keepId: z.number().int().positive(),
    mergeIds: z.array(z.number().int().positive()).min(1),
    dryRun: z.boolean().optional().default(false),
  })
  .refine((d) => !d.mergeIds.includes(d.keepId), {
    message: "keepId cannot be one of mergeIds",
    path: ["mergeIds"],
  });

export type MergeInput = z.infer<typeof mergeSchema>;
