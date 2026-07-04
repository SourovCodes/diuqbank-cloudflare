#!/usr/bin/env tsx
// Emit the hand-written OpenAPI doc as JSON so the web app can regenerate its
// API types from source (no deploy needed). Output is gitignored.
//
//   pnpm --filter diuqbank-api run openapi:emit   # writes apps/api/openapi.json

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { openApiDoc } from "../src/openapi";

const out = fileURLToPath(new URL("../openapi.json", import.meta.url));
writeFileSync(out, JSON.stringify(openApiDoc, null, 2) + "\n");
console.log(`Wrote ${out}`);
