import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
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

type AppJwt = JWT & {
  role?: Role;
  country?: string | null;
  userMissing?: boolean;
};

async function syncTokenUser(token: AppJwt) {
  if (!token.sub) {
    token.userMissing = true;
    return token;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      country: true,
    },
  });

  if (!user) {
    token.userMissing = true;
    token.role = undefined;
    token.country = undefined;
    return token;
  }

  token.sub = user.id;
  token.email = user.email;
  token.name = user.name;
  token.picture = user.image;
  token.role = user.role;
  token.country = user.country;
  token.userMissing = false;
  return token;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
    async signIn({ user, account }) {
      if (account?.provider !== "credentials" && !user.email) {
        return false;
      }
      return true;
    },
    async session({ session, token }) {
      const appToken = token as AppJwt;
      if (appToken.userMissing) {
        session.user = undefined;
        return session;
      }

      if (session.user) {
        session.user.id = appToken.sub ?? "";
        session.user.role = appToken.role ?? Role.REFEREE;
        session.user.country = appToken.country ?? null;
      }
      return session;
    },
    async jwt({ token, user }) {
      const appToken = token as AppJwt;
      if (user?.id) {
        appToken.sub = user.id;
      }
      return syncTokenUser(appToken);
    },
  },
};

