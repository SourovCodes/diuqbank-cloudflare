import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { openApiDoc } from "../../../apps/api/src/openapi.ts";

const output = fileURLToPath(new URL("../openapi.json", import.meta.url));
writeFileSync(output, `${JSON.stringify(openApiDoc, null, 2)}\n`, "utf8");
