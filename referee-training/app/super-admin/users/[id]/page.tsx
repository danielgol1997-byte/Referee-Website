import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SuperAdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      country: true,
      level: true,
      authProvider: true,
      profileComplete: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">User details</h2>
          <p className="text-sm text-text-secondary">Basic account information for testing.</p>
        </div>
        <Link
          href="/super-admin?tab=users"
          className="text-sm text-accent hover:text-accent/80"
        >
          Back to users
        </Link>
      </div>

      <div className="rounded-xl border border-dark-600 bg-dark-900/60">
        <div className="grid gap-4 p-6 text-sm text-text-secondary">
          <div>
            <div className="text-xs uppercase text-text-muted">Name</div>
            <div className="text-text-primary">{user.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-muted">Email</div>
            <div className="text-text-primary">{user.email}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-text-muted">Role</div>
              <div className="text-text-primary">{user.role}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-text-muted">Status</div>
              <div className="text-text-primary">{user.isActive ? "Active" : "Inactive"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-text-muted">Country</div>
              <div className="text-text-primary">{user.country ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-text-muted">Level</div>
              <div className="text-text-primary">{user.level ?? "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-text-muted">Auth provider</div>
              <div className="text-text-primary">{user.authProvider}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-text-muted">Profile complete</div>
              <div className="text-text-primary">{user.profileComplete ? "Yes" : "No"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-text-muted">Created</div>
              <div className="text-text-primary">{user.createdAt.toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-text-muted">Last login</div>
              <div className="text-text-primary">
                {user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : "—"}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-muted">User ID</div>
            <div className="text-text-primary">{user.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
