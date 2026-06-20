import { z } from "zod";

import { pageFields } from "../lib/pagination";

export const contributorsListQuery = z.object({ ...pageFields });

export type ContributorsListQuery = z.infer<typeof contributorsListQuery>;
