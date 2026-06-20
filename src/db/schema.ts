import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Public handle, opaque-generated on first Google sign-in.
  username: text("username").notNull().unique(),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  // R2 object key for the profile image (e.g. `users/<uuid>.png`); null = none.
  imageKey: text("image_key"),
  // Unix epoch seconds (UTC). Returned to clients as a number.
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
