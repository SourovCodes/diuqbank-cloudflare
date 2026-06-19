import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

/** Create a Drizzle client bound to the request's D1 binding. */
export const getDb = (d1: D1Database) => drizzle(d1, { schema });

export type Db = ReturnType<typeof getDb>;
