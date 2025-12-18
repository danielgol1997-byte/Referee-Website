import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  // Required in production. Without a stable secret, JWT/session cookies can become invalid
  // across serverless instances, which looks like "logged in on / but logged out on other pages".
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('[AUTH] Authorize called with email:', credentials?.email);
        
        if (!credentials?.email || !credentials.password) {
          console.log('[AUTH] Missing credentials');
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log('[AUTH] User found:', !!user, 'Has password:', !!user?.password);

        if (!user?.password) {
          console.log('[AUTH] No user or no password');
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        console.log('[AUTH] Password valid:', isValid);
        
        if (!isValid) {
          console.log('[AUTH] Invalid password');
          return null;
        }

        console.log('[AUTH] Login successful for:', user.email);
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
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
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
      const clientId = process.env.APPLE_CLIENT_ID;
      const clientSecret = process.env.APPLE_CLIENT_SECRET;
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
      const clientId = process.env.FACEBOOK_CLIENT_ID;
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
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
    async jwt({ token, user, trigger }) {
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

