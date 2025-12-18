import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const role = req.nextauth.token?.role;
    const pathname = req.nextUrl.pathname;

    // Preserve the current URL as callbackUrl when redirecting to login
    const currentUrl = req.nextUrl.pathname + req.nextUrl.search;

    if (pathname.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", currentUrl);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", currentUrl);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // If not authorized, NextAuth will redirect to signIn with callbackUrl automatically
        // But we also handle role-based redirects in the middleware function above
        if (!token) {
          // NextAuth will automatically preserve the current URL as callbackUrl
          return false;
        }
        return true;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
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
  ],
};

