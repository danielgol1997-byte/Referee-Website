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

        if (!user?.password || user.isActive === false) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

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
    async signIn({ user, account, profile }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      const email = user.email ?? (profile as { email?: string | null } | undefined)?.email;
      if (!email) {
        return false;
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, isActive: true, image: true, name: true, authProvider: true },
      });

      if (existing && existing.isActive === false) {
        return false;
      }

      if (!existing) {
        await prisma.user.create({
          data: {
            email,
            name: user.name ?? (profile as { name?: string | null } | undefined)?.name ?? "Google User",
            image: user.image ?? (profile as { picture?: string | null } | undefined)?.picture ?? null,
            role: Role.REFEREE,
            authProvider: account.provider,
            profileComplete: false,
            lastLoginAt: new Date(),
          },
        });
        return true;
      }

      await prisma.user.update({
        where: { id: existing.id },
        data: {
          lastLoginAt: new Date(),
          ...(existing.authProvider !== account.provider && { authProvider: account.provider }),
          ...(existing.name ? {} : { name: user.name ?? existing.name }),
          ...(existing.image ? {} : { image: user.image ?? existing.image }),
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        const tokenWithRole = token as {
          role?: Role;
          country?: string | null;
          sub?: string;
          profileComplete?: boolean;
          isActive?: boolean;
        };
        session.user.id = tokenWithRole.sub ?? "";
        session.user.role = tokenWithRole.role ?? Role.REFEREE;
        session.user.country = tokenWithRole.country ?? null;
        session.user.profileComplete = tokenWithRole.profileComplete ?? false;
        session.user.isActive = tokenWithRole.isActive ?? true;
      }
      return session;
    },
    async jwt({ token, user }) {
      // On sign in, user object is passed. Store role in token.
      if (user) {
        const userWithRole = user as { role?: Role; country?: string | null; email?: string | null };
        if (userWithRole.email) {
          token.email = userWithRole.email;
        }
        if (userWithRole.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: userWithRole.email },
            select: {
              id: true,
              role: true,
              country: true,
              profileComplete: true,
              isActive: true,
            },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role;
            token.country = dbUser.country;
            token.profileComplete = dbUser.profileComplete;
            token.isActive = dbUser.isActive;
            return token;
          }
        }

        token.role = userWithRole.role;
        token.country = userWithRole.country;
      }
      if (token.email && (token.profileComplete === false || token.role === undefined || token.isActive === undefined)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            role: true,
            country: true,
            profileComplete: true,
            isActive: true,
          },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.country = dbUser.country;
          token.profileComplete = dbUser.profileComplete;
          token.isActive = dbUser.isActive;
        }
      }
      // Ensure role persists on token for middleware access
      return token;
    },
  },
};

