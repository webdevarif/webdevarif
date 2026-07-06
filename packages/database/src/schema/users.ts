import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    fullName: varchar("full_name", { length: 100 }).notNull(),
    // Nullable: AuthPass (OIDC) sign-ins never set a local password.
    passwordHash: text("password_hash"),
    company: varchar("company", { length: 100 }),
    // Stable `sub` claim from AuthPass OIDC — set once a user links/creates
    // their account via "Sign in with AuthPass". Null for password-only users.
    authpassSub: text("authpass_sub").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_username_idx").on(table.username),
    index("users_authpass_sub_idx").on(table.authpassSub),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
