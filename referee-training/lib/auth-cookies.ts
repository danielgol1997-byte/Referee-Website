import type { CookieOption } from "next-auth";
import { env } from "./env";

export const useSecureAuthCookies = env.NODE_ENV === "production";

export const authSessionCookieName = `${
  useSecureAuthCookies ? "__Secure-" : ""
}next-auth.session-token`;

export const authSessionCookie: CookieOption = {
  name: authSessionCookieName,
  options: {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureAuthCookies,
  },
};
