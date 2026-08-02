import { z } from "zod";

/**
 * Centralized environment validation.
 *
 * Why this matters for your bug:
 * - If `NEXTAUTH_SECRET` is missing (or changes between instances), NextAuth JWT cookies
 *   become intermittently unreadable in middleware/server, which looks like:
 *   "logged in on / but other pages redirect to /auth/login".
 */

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional()
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional()
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Auth must be stable across instances (especially on Vercel).
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),

  // Strongly recommended in production, but we don't hard-require because
  // Vercel sets `VERCEL_URL` and some setups derive NEXTAUTH_URL elsewhere.
  NEXTAUTH_URL: optionalUrl,

  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  APPLE_CLIENT_ID: optionalNonEmptyString,
  APPLE_CLIENT_SECRET: optionalNonEmptyString,
  FACEBOOK_CLIENT_ID: optionalNonEmptyString,
  FACEBOOK_CLIENT_SECRET: optionalNonEmptyString,

  NEXTAUTH_DEBUG: optionalNonEmptyString,
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast rather than creating "flaky auth" in production/serverless.
  // This surfaces a clean error in Vercel logs during build/runtime.
  throw new Error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n")}`
  );
}

export const env = parsed.data;

