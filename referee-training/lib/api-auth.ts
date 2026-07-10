import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { isAdmin, isSuperAdmin } from "./roles";
import { prisma } from "./prisma";

export type AuthedUser = {
  id: string;
  role: string;
  associationId: string | null;
};

/**
 * Resolves the current user with the federation context needed for scoping.
 * Reads associationId from the database so it is correct even for older JWTs
 * issued before the field existed.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, associationId: true },
  });
  if (!dbUser) return null;
  return {
    id: dbUser.id,
    role: dbUser.role,
    associationId: dbUser.associationId ?? null,
  };
}

export type Guard =
  | { ok: true; user: AuthedUser }
  | { ok: false; status: number; error: string };

/** Requires SUPER_ADMIN or DEVELOPER. */
export async function requireSuperAdmin(): Promise<Guard> {
  const user = await getAuthedUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  if (!isSuperAdmin(user.role)) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, user };
}

/** Requires ADMIN, SUPER_ADMIN, or DEVELOPER. */
export async function requireAdmin(): Promise<Guard> {
  const user = await getAuthedUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  if (!isAdmin(user.role)) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, user };
}
