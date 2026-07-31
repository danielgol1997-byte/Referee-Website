import { withAuth } from "next-auth/middleware";
import { env } from "@/lib/env";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      // Middleware can only decode the existing JWT. Server-side guards enforce
      // current roles after the auth callback refreshes them from Prisma.
      return !!token;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: env.NEXTAUTH_SECRET,
});

export const config = {
  matcher: [
    "/laws/:path*",
    "/practice/:path*",
    "/library/:path*",
    "/stats",
    "/admin/:path*",
    "/super-admin/:path*",
  ],
};

