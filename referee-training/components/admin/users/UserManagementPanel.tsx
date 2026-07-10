"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Association = {
  id: string;
  name: string;
  countryCode: string | null;
  isInternational: boolean;
};

type RankOption = { id: string; name: string; associationId: string | null };

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
  internationalAssociationId: string | null;
  internationalAssociation: { id: string; name: string } | null;
  internationalRank: { id: string; name: string } | null;
};

const UNASSIGNED = "__none__";
const NONE = "__none__";

const STATUS_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_OPTIONS = [
  { value: "REFEREE", label: "Referee" },
  { value: "ADMIN", label: "FA Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "DEVELOPER", label: "Developer" },
];

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-dark-700/70">
          <td className="px-3 py-3">
            <div className="h-4 w-36 animate-pulse rounded bg-dark-700/70" />
            <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-dark-700/50" />
          </td>
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-3 py-3">
              <div
                className="h-8 animate-pulse rounded-lg bg-dark-700/50"
                style={{ animationDelay: `${(i * 8 + j) * 60}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [ranks, setRanks] = useState<RankOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [faFilter, setFaFilter] = useState("all");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const loadHierarchy = useCallback(() => {
    fetch("/api/admin/associations")
      .then((r) => r.json())
      .then((data) => setAssociations(data.associations ?? []))
      .catch(() => {});
    // One fetch returns every rank (FA-scoped + international) for super admins.
    fetch("/api/admin/ranks")
      .then((r) => r.json())
      .then((data) => setRanks(data.ranks ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadHierarchy();
    // FederationsPanel dispatches this after any hierarchy edit so the
    // dropdowns here stay fresh without a page reload.
    window.addEventListener("fa-hierarchy-changed", loadHierarchy);
    return () => window.removeEventListener("fa-hierarchy-changed", loadHierarchy);
  }, [loadHierarchy]);

  const nationalAssociations = useMemo(
    () => associations.filter((a) => !a.isInternational),
    [associations]
  );
  const internationalFederations = useMemo(
    () => associations.filter((a) => a.isInternational),
    [associations]
  );

  const faFilterOptions = useMemo(
    () => [
      { value: "all", label: "All federations" },
      { value: UNASSIGNED, label: "Unassigned" },
      ...nationalAssociations.map((a) => ({ value: a.id, label: a.name })),
    ],
    [nationalAssociations]
  );

  const faColumnOptions = useMemo(
    () => [
      { value: UNASSIGNED, label: "Unassigned" },
      ...nationalAssociations.map((a) => ({ value: a.id, label: a.name })),
    ],
    [nationalAssociations]
  );

  const internationalOptions = useMemo(
    () => [
      { value: NONE, label: "None" },
      ...internationalFederations.map((a) => ({ value: a.id, label: `🌍 ${a.name}` })),
    ],
    [internationalFederations]
  );

  const ranksByAssociation = useMemo(() => {
    const map = new Map<string | null, RankOption[]>();
    for (const rank of ranks) {
      const key = rank.associationId;
      const list = map.get(key) ?? [];
      list.push(rank);
      map.set(key, list);
    }
    return map;
  }, [ranks]);

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
      setRefreshing(true);
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
        if (active) {
          setRefreshing(false);
          setLoaded(true);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [queryString]);

  const usersRef = useRef(users);
  usersRef.current = users;

  /**
   * Optimistic PATCH: applies the change to the row immediately, then
   * reconciles with (or reverts to) the server response in the background.
   */
  const patchUser = useCallback(
    async (id: string, payload: Record<string, unknown>, optimistic: Partial<UserRow>) => {
      const snapshot = usersRef.current.find((u) => u.id === id);
      if (!snapshot) return;

      setError(null);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...optimistic } : u)));
      setSavingIds((prev) => new Set(prev).add(id));

      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to update user");
        const server = data.user ?? {};
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...server } : u)));
      } catch (err) {
        // Revert to the pre-edit snapshot so the UI never lies.
        setUsers((prev) => prev.map((u) => (u.id === id ? snapshot : u)));
        setError(err instanceof Error ? err.message : "Failed to update user");
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    []
  );

  const updateRole = (user: UserRow, role: string) => {
    if (role === user.role) return;
    // FA Admins must administer a specific federation.
    if (role === "ADMIN" && !user.associationId) {
      setError("Assign a federation to this user before making them an FA Admin.");
      return;
    }
    patchUser(user.id, { role }, { role });
  };

  const updateAssociation = (user: UserRow, associationId: string | null) => {
    if (associationId === user.associationId) return;
    const association = associationId
      ? associations.find((a) => a.id === associationId) ?? null
      : null;
    // Moving federation resets rank server-side; mirror that optimistically.
    patchUser(
      user.id,
      { associationId },
      { associationId, association, rank: null }
    );
  };

  const updateRank = (user: UserRow, rankId: string | null) => {
    if ((user.rank?.id ?? null) === rankId) return;
    const rank = rankId ? ranks.find((r) => r.id === rankId) ?? null : null;
    patchUser(
      user.id,
      { rankId },
      { rank: rank ? { id: rank.id, name: rank.name } : null }
    );
  };

  const updateInternationalFederation = (user: UserRow, internationalAssociationId: string | null) => {
    if (internationalAssociationId === user.internationalAssociationId) return;
    const federation = internationalAssociationId
      ? internationalFederations.find((a) => a.id === internationalAssociationId) ?? null
      : null;
    // Changing federation resets the category server-side; mirror that here.
    patchUser(
      user.id,
      { internationalAssociationId },
      {
        internationalAssociationId,
        internationalAssociation: federation ? { id: federation.id, name: federation.name } : null,
        internationalRank: null,
      }
    );
  };

  const updateInternationalRank = (user: UserRow, internationalRankId: string | null) => {
    if ((user.internationalRank?.id ?? null) === internationalRankId) return;
    const category = internationalRankId
      ? ranks.find((r) => r.id === internationalRankId) ?? null
      : null;
    patchUser(
      user.id,
      { internationalRankId },
      { internationalRank: category ? { id: category.id, name: category.name } : null }
    );
  };

  const updateStatus = (user: UserRow, isActive: boolean) => {
    patchUser(user.id, { isActive }, { isActive });
  };

  const updateProfile = (user: UserRow, profileComplete: boolean) => {
    patchUser(user.id, { profileComplete }, { profileComplete });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">User Management</h2>
          <p className="text-sm text-text-secondary">
            Assign federations, ranks, and roles. Make someone an FA Admin to let them manage
            referees inside their federation.
          </p>
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
        <div className="relative flex items-center justify-between border-b border-dark-700 px-4 py-3 text-sm text-text-muted">
          <span>
            {!loaded
              ? "Loading users…"
              : `${users.length} user${users.length === 1 ? "" : "s"} found`}
          </span>
          {loaded && refreshing && (
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="h-3 w-3 animate-spin rounded-full border-[2px] border-accent/30 border-t-accent" />
              Updating
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-text-secondary">
            <thead className="bg-dark-800/80 text-xs uppercase text-text-muted">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">User</th>
                <th className="px-3 py-3 text-left font-semibold">Federation / Rank</th>
                <th className="px-3 py-3 text-left font-semibold">International</th>
                <th className="px-3 py-3 text-left font-semibold">Role</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
                <th className="px-3 py-3 text-left font-semibold">Profile</th>
                <th className="px-3 py-3 text-left font-semibold">Last login</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loaded ? (
                <SkeletonRows />
              ) : (
                users.map((user) => {
                  const saving = savingIds.has(user.id);
                  const faRanks = user.associationId
                    ? ranksByAssociation.get(user.associationId) ?? []
                    : [];
                  const rankOptions = [
                    { value: NONE, label: "Unranked" },
                    ...faRanks.map((r) => ({ value: r.id, label: r.name })),
                  ];
                  const federationCategories = user.internationalAssociationId
                    ? ranksByAssociation.get(user.internationalAssociationId) ?? []
                    : [];
                  const categoryOptions = [
                    { value: NONE, label: "No category" },
                    ...federationCategories.map((r) => ({ value: r.id, label: r.name })),
                  ];

                  return (
                    <tr
                      key={user.id}
                      className={`border-t border-dark-700/70 transition-opacity ${
                        saving ? "opacity-70" : ""
                      }`}
                    >
                      <td className="max-w-[220px] px-3 py-3">
                        <Link
                          className="block truncate font-medium text-accent hover:text-accent/80"
                          href={`/super-admin/users/${user.id}`}
                          title={user.name ?? undefined}
                        >
                          {user.name || "View user"}
                        </Link>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs text-text-muted" title={user.email}>
                            {user.email}
                          </span>
                          <span className="shrink-0 rounded bg-dark-700/80 px-1 py-px text-[10px] uppercase text-text-muted">
                            {user.authProvider}
                          </span>
                        </div>
                      </td>
                      <td className="w-[165px] px-3 py-3">
                        <div className="space-y-1.5">
                          <Select
                            value={user.associationId ?? UNASSIGNED}
                            onChange={(value) =>
                              updateAssociation(user, value === UNASSIGNED ? null : String(value))
                            }
                            options={faColumnOptions}
                          />
                          {user.associationId && (
                            <Select
                              value={user.rank?.id ?? NONE}
                              onChange={(value) =>
                                updateRank(user, value === NONE ? null : String(value))
                              }
                              options={rankOptions}
                            />
                          )}
                        </div>
                      </td>
                      <td className="w-[165px] px-3 py-3">
                        <div className="space-y-1.5">
                          <Select
                            value={user.internationalAssociationId ?? NONE}
                            onChange={(value) =>
                              updateInternationalFederation(
                                user,
                                value === NONE ? null : String(value)
                              )
                            }
                            options={internationalOptions}
                          />
                          {user.internationalAssociationId && (
                            <Select
                              value={user.internationalRank?.id ?? NONE}
                              onChange={(value) =>
                                updateInternationalRank(user, value === NONE ? null : String(value))
                              }
                              options={categoryOptions}
                            />
                          )}
                        </div>
                      </td>
                      <td className="w-[150px] px-3 py-3">
                        <Select
                          value={user.role}
                          onChange={(value) => updateRole(user, String(value))}
                          options={ROLE_OPTIONS}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            user.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => updateProfile(user, !user.profileComplete)}
                        >
                          {user.profileComplete ? "Complete" : "Needs info"}
                        </Button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{formatDate(user.lastLoginAt)}</td>
                      <td className="px-3 py-3 text-right">
                        {user.isActive ? (
                          <Button variant="danger" size="xs" onClick={() => updateStatus(user, false)}>
                            Deactivate
                          </Button>
                        ) : (
                          <Button variant="secondary" size="xs" onClick={() => updateStatus(user, true)}>
                            Activate
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {loaded && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-text-muted">
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
