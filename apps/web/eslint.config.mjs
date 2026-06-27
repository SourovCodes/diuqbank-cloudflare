import { defineConfig, globalIgnores } from "eslint/config";

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default defineConfig([
  globalIgnores(["dist/**", ".wrangler/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // Advisory only: the context provider, the entry file, and a couple of
      // convenience re-exports legitimately mix component and non-component
      // exports. Keep the react-hooks rules as errors; downgrade this one.
      "react-refresh/only-export-components": "warn",
    },
  },
]);
