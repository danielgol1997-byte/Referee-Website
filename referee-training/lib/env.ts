import { z } from "zod";

/**
 * Centralized environment validation.
 *
 * Why this matters for your bug:
 * - If `NEXTAUTH_SECRET` is missing (or changes between instances), NextAuth JWT cookies
 *   become intermittently unreadable in middleware/server, which looks like:
 *   "logged in on / but other pages redirect to /auth/login".
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Auth must be stable across instances (especially on Vercel).
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),

  // Strongly recommended in production, but we don't hard-require because
  // Vercel sets `VERCEL_URL` and some setups derive NEXTAUTH_URL elsewhere.
  NEXTAUTH_URL: z.string().url().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),

  NEXTAUTH_DEBUG: z.string().optional(),
  SUPER_ADMIN_EMAILS: z.string().optional(),
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

