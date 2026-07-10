import { redirect } from "next/navigation";

/**
 * The dedicated FA admin panel was retired: admins and super admins manage
 * everything (ranks, federations, international assignments, content) from
 * the Control Panel. Old links land there.
 */
export default function AdminRedirect() {
  redirect("/super-admin");
}
