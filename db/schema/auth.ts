import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "@/db/schema/columns";

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

export const user = pgTable("user", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("user"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  ...timestamps(),
});

export const session = pgTable("session", {
  id: id(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps(),
});

export const account = pgTable(
  "account",
  {
    id: id(),
    /**
     * Namespaces `accountId` to the authority that issued it, so a provider's
     * subject id can never collide with another's. Better Auth writes
     * `"local:credential"` for an email-and-password Account and the OIDC
     * issuer URL for a social one; the property must be spelled `issuer`
     * because the Drizzle adapter resolves Better Auth's field names against
     * these property keys, not against the column names.
     *
     * Sign in matches on it (`providerId`, `issuer` and `accountId` together),
     * so an Account row missing it is an Account nobody can sign in to.
     */
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps(),
  },
  // Declared unique by Better Auth's own account table: one identity per
  // issuer, so the same subject cannot be linked twice.
  (t) => [
    uniqueIndex("account_issuer_account_id_unique").on(t.issuer, t.accountId),
  ],
);

export const verification = pgTable("verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps(),
});
