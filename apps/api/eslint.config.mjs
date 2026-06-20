import { defineConfig, globalIgnores } from "eslint/config";

import { baseTypeScriptConfig } from "@diuqbank/config/eslint/base";
import { generatedIgnores } from "@diuqbank/config/eslint/ignores";

export default defineConfig([
  ...baseTypeScriptConfig,
  globalIgnores(generatedIgnores),
]);
