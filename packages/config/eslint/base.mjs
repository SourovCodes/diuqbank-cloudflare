import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export const baseTypeScriptConfig = [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
];
