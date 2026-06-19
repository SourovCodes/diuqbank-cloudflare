import { drizzle } from "drizzle-orm/d1";

import type { AppBindings } from "../env";
import * as schema from "./schema";

/** Create a Drizzle client bound to the request's D1 binding. */
export function createDb(env: AppBindings["Bindings"]) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof createDb>;
