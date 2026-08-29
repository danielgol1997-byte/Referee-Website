import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import { compare } from "bcryptjs";
import { createHash } from "crypto";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { env } from "./env";

const MAX_FAILED_CREDENTIAL_ATTEMPTS = 5;
const CREDENTIAL_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const CREDENTIAL_LOCKOUT_MS = 15 * 60 * 1000;

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function credentialAttemptKey(email: string) {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

async function assertCredentialLoginAllowed(key: string) {
  const attempt = await prisma.credentialLoginAttempt.findUnique({
    where: { key },
    select: { lockedUntil: true },
  });

  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw new Error("Too many failed login attempts. Please wait before trying again.");
  }
}

async function recordFailedCredentialLogin(key: string) {
  const now = new Date();
  const existing = await prisma.credentialLoginAttempt.findUnique({
    where: { key },
    select: { failedCount: true, firstFailedAt: true },
  });

  const windowExpired =
    !existing || now.getTime() - existing.firstFailedAt.getTime() > CREDENTIAL_ATTEMPT_WINDOW_MS;

  if (windowExpired) {
    await prisma.credentialLoginAttempt.upsert({
      where: { key },
      create: {
        key,
        failedCount: 1,
        firstFailedAt: now,
        lockedUntil: null,
      },
      update: {
        failedCount: 1,
        firstFailedAt: now,
        lockedUntil: null,
      },
    });
    return;
  }

  const failedCount = existing.failedCount + 1;
  await prisma.credentialLoginAttempt.update({
    where: { key },
    data: {
      failedCount,
      lockedUntil:
        failedCount >= MAX_FAILED_CREDENTIAL_ATTEMPTS
          ? new Date(now.getTime() + CREDENTIAL_LOCKOUT_MS)
          : null,
    },
  });
}

async function clearFailedCredentialLogins(key: string) {
  await prisma.credentialLoginAttempt.deleteMany({ where: { key } });
}

export const authOptions: NextAuthOptions = {
  debug: env.NEXTAUTH_DEBUG === "true" || env.NODE_ENV === "development",
  // Critical: must be stable in production/serverless, or auth will appear "randomly logged out".
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  useSecureCookies: env.NODE_ENV === "production",
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days - must match session maxAge
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = credentials.email.trim();
        const attemptKey = credentialAttemptKey(email);
        await assertCredentialLoginAllowed(attemptKey);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.password) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          await recordFailedCredentialLogin(attemptKey);
          return null;
        }

        await clearFailedCredentialLogins(attemptKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          country: user.country,
        };
      },
    }),
    ...(() => {
      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      return isNonEmpty(clientId) && isNonEmpty(clientSecret)
      ? [
          GoogleProvider({
            clientId,
            clientSecret,
          }),
        ]
      : [];
    })(),
    ...(() => {
      const clientId = env.APPLE_CLIENT_ID;
      const clientSecret = env.APPLE_CLIENT_SECRET;
      return isNonEmpty(clientId) && isNonEmpty(clientSecret)
      ? [
          AppleProvider({
            clientId,
            clientSecret,
          }),
        ]
      : [];
    })(),
    ...(() => {
      const clientId = env.FACEBOOK_CLIENT_ID;
      const clientSecret = env.FACEBOOK_CLIENT_SECRET;
      return isNonEmpty(clientId) && isNonEmpty(clientSecret)
      ? [
          FacebookProvider({
            clientId,
            clientSecret,
          }),
        ]
      : [];
    })(),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        const tokenWithRole = token as { role?: Role; country?: string | null; sub?: string };
        session.user.id = tokenWithRole.sub ?? "";
        session.user.role = tokenWithRole.role ?? Role.REFEREE;
        session.user.country = tokenWithRole.country ?? null;
      }
      return session;
    },
    async jwt({ token, user }) {
      // On sign in, user object is passed. Store role in token.
      if (user) {
        const userWithRole = user as { role?: Role; country?: string | null };
        token.role = userWithRole.role;
        token.country = userWithRole.country;
      }
      // Ensure role persists on token for middleware access
      return token;
    },
  },
};

