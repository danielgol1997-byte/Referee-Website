import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { env } from "@/lib/env";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const role = token?.role;
    const pathname = req.nextUrl.pathname;

    if (token && token.profileComplete === false && !pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Role-gated areas: if you're authenticated but not allowed, don't bounce to login.
    // Redirect to home (or you can later replace with a dedicated /forbidden page).
    if (pathname.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // If not authorized, NextAuth will redirect to signIn with callbackUrl automatically.
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
    secret: env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: [
    "/laws/:path*",
    "/practice/:path*",
    "/library/:path*",
    "/stats",
    "/admin/:path*",
    "/super-admin/:path*",
    "/account",
    "/onboarding",
  ],
};

