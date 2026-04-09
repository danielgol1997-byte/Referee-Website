/**
 * Centralised role helpers.
 *
 * Role hierarchy (highest → lowest):
 *   DEVELOPER  – all SUPER_ADMIN capabilities + developer-only tools
 *   SUPER_ADMIN – full admin access
 *   ADMIN       – content management
 *   REFEREE     – end-user
 *
 * Keep this file in sync with the Prisma `Role` enum.
 */

/** Roles that can access the /super-admin control panel. */
export const SUPER_ROLES = ["SUPER_ADMIN", "DEVELOPER"] as const;
export type SuperRole = (typeof SUPER_ROLES)[number];

/** Roles that can access /admin and all admin API routes. */
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "DEVELOPER"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Returns true for SUPER_ADMIN and DEVELOPER. */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return SUPER_ROLES.includes(role as SuperRole);
}

/** Returns true for ADMIN, SUPER_ADMIN, and DEVELOPER. */
export function isAdmin(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role as AdminRole);
}

/** Returns true only for DEVELOPER. */
export function isDeveloper(role: string | null | undefined): boolean {
  return role === "DEVELOPER";
}
