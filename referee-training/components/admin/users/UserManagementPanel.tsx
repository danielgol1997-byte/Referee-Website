"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Association = { id: string; name: string; countryCode: string | null };

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  country: string | null;
  level: string | null;
  image: string | null;
  authProvider: string;
  profileComplete: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  associationId: string | null;
  association: Association | null;
  rank: { id: string; name: string } | null;
  internationalRank: { id: string; name: string } | null;
};

const UNASSIGNED = "__none__";

const STATUS_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_OPTIONS = [
  { value: "REFEREE", label: "Referee" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "DEVELOPER", label: "Developer" },
];

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export function UserManagementPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [faFilter, setFaFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/associations")
      .then((r) => r.json())
      .then((data) => setAssociations(data.associations ?? []))
      .catch(() => {});
  }, []);

  const faFilterOptions = useMemo(
    () => [
      { value: "all", label: "All federations" },
      { value: UNASSIGNED, label: "Unassigned" },
      ...associations.map((a) => ({ value: a.id, label: a.name })),
    ],
    [associations]
  );

  const faColumnOptions = useMemo(
    () => [
      { value: UNASSIGNED, label: "Unassigned" },
      ...associations.map((a) => ({ value: a.id, label: a.name })),
    ],
    [associations]
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (faFilter === UNASSIGNED) params.set("associationId", "none");
    else if (faFilter !== "all") params.set("associationId", faFilter);
    return params.toString();
  }, [search, status, faFilter]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users?${queryString}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load users");
        if (active) setUsers(data.users ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load users";
        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [queryString]);

  const updateStatus = async (id: string, isActive: boolean) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update user");
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, isActive: data.user?.isActive ?? isActive } : user))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const updateRole = async (id: string, role: string) => {
    // FA Admins must administer a specific federation.
    const target = users.find((u) => u.id === id);
    if (role === "ADMIN" && target && !target.associationId) {
      setError("Assign a federation to this user before making them an FA Admin.");
      return;
    }
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update user role");
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, role: data.user?.role ?? role } : user))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user role";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const updateAssociation = async (id: string, associationId: string | null) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ associationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update federation");
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id
            ? {
                ...user,
                associationId: data.user?.associationId ?? null,
                association: data.user?.association ?? null,
                // Moving federation resets rank server-side.
                rank: data.user?.rank ?? null,
                internationalRank: data.user?.internationalRank ?? null,
              }
            : user
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update federation";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const updateProfile = async (id: string, profileComplete: boolean) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileComplete }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update profile status");
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, profileComplete: data.user?.profileComplete ?? profileComplete } : user
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile status";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">User Management</h2>
          <p className="text-sm text-text-secondary">View and deactivate accounts before the full signup flow.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
          />
        </div>
        <div className="min-w-[200px]">
          <Select value={status} onChange={(value) => setStatus(String(value))} options={STATUS_OPTIONS} />
        </div>
        <div className="min-w-[200px]">
          <Select value={faFilter} onChange={(value) => setFaFilter(String(value))} options={faFilterOptions} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-dark-600 bg-dark-900/60">
        <div className="border-b border-dark-700 px-4 py-3 text-sm text-text-muted">
          {loading ? "Loading users..." : `${users.length} user${users.length === 1 ? "" : "s"} found`}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-text-secondary">
            <thead className="bg-dark-800/80 text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Provider</th>
                <th className="px-4 py-3 text-left font-semibold">Federation</th>
                <th className="px-4 py-3 text-left font-semibold">Rank</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Profile</th>
                <th className="px-4 py-3 text-left font-semibold">Last login</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-dark-700/70">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <Link className="text-accent hover:text-accent/80" href={`/super-admin/users/${user.id}`}>
                      {user.name || "View user"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 capitalize">{user.authProvider}</td>
                  <td className="px-4 py-3 min-w-[180px]">
                    <Select
                      value={user.associationId ?? UNASSIGNED}
                      onChange={(value) =>
                        updateAssociation(user.id, value === UNASSIGNED ? null : String(value))
                      }
                      options={faColumnOptions}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.rank?.name ?? <span className="text-text-muted">Unranked</span>}
                    {user.internationalRank && (
                      <span className="ml-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">
                        {user.internationalRank.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[150px]">
                    <Select
                      value={user.role}
                      onChange={(value) => updateRole(user.id, String(value))}
                      options={ROLE_OPTIONS}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                        user.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => updateProfile(user.id, !user.profileComplete)}
                      disabled={actionLoading === user.id}
                    >
                      {user.profileComplete ? "Complete" : "Needs info"}
                    </Button>
                  </td>
                  <td className="px-4 py-3">{formatDate(user.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {user.isActive ? (
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => updateStatus(user.id, false)}
                        disabled={actionLoading === user.id}
                      >
                        {actionLoading === user.id ? "Updating..." : "Deactivate"}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => updateStatus(user.id, true)}
                        disabled={actionLoading === user.id}
                      >
                        {actionLoading === user.id ? "Updating..." : "Activate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-muted">
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
