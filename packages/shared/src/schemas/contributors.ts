import { z } from "zod";

import { pageFields } from "../utils/pagination";

export const contributorsListQuery = z.object({ ...pageFields });

export type ContributorsListQuery = z.infer<typeof contributorsListQuery>;

export const contributorSubmissionsQuery = z.object({ ...pageFields });

export type ContributorSubmissionsQuery = z.infer<
  typeof contributorSubmissionsQuery
>;
