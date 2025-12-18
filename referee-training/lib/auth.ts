import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { env } from "./env";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.password) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

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

