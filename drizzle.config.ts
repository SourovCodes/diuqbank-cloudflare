import { defineConfig } from "drizzle-kit";

// Generate-only config. Migrations are applied to D1 via
// `wrangler d1 migrations apply` (local/remote), so no D1 HTTP token is needed here.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
