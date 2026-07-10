"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CountryPicker } from "@/components/ui/CountryPicker";
import { codeForCountry, countryForCode, flagEmoji } from "@/lib/countries";

export type ProfileInitialValues = {
  name: string;
  country: string;
  associationId: string | null;
  associationName: string | null;
  associationCountryCode: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  weightKg: number | null;
  image: string | null;
};

type AssociationOption = { id: string; name: string; countryCode: string | null };

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function ProfileForm({
  initialValues,
  title,
  description,
  submitLabel = "Save",
  redirectTo,
}: {
  initialValues: ProfileInitialValues;
  title: string;
  description?: string;
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialValues.name ?? "");
  const [countryCode, setCountryCode] = useState(codeForCountry(initialValues.country) ?? "");
  const [associationId, setAssociationId] = useState(initialValues.associationId ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(toDateInput(initialValues.dateOfBirth));
  const [heightCm, setHeightCm] = useState(initialValues.heightCm ? String(initialValues.heightCm) : "");
  const [weightKg, setWeightKg] = useState(initialValues.weightKg ? String(initialValues.weightKg) : "");
  const [image, setImage] = useState(initialValues.image ?? "");

  const [associations, setAssociations] = useState<AssociationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // FA is chosen once, at onboarding. After it's assigned, only an admin moves it.
  const associationLocked = Boolean(initialValues.associationId);

  useEffect(() => {
    if (associationLocked) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/associations");
        const data = await res.json();
        if (active && res.ok) setAssociations(data.associations ?? []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, [associationLocked]);

  // Sort associations that match the chosen country first.
  const associationOptions = useMemo(() => {
    const sorted = [...associations].sort((a, b) => {
      const am = a.countryCode === countryCode ? 0 : 1;
      const bm = b.countryCode === countryCode ? 0 : 1;
      if (am !== bm) return am - bm;
      return a.name.localeCompare(b.name);
    });
    return [
      { value: "", label: "Select your association" },
      ...sorted.map((a) => ({ value: a.id, label: `${flagEmoji(a.countryCode) || "🏳️"} ${a.name}` })),
    ];
  }, [associations, countryCode]);

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/users/me/photo/sign", { method: "POST" });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign?.error ?? "Could not start upload");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sign.apiKey);
      formData.append("timestamp", String(sign.timestamp));
      formData.append("signature", sign.signature);
      formData.append("folder", sign.folder);
      formData.append("tags", sign.tags);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploaded?.error?.message ?? "Upload failed");
      setImage(uploaded.secure_url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const country = countryForCode(countryCode) ?? "";
    if (!name.trim() || !country) {
      setError("Name and country are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          country,
          image: image || undefined,
          ...(associationLocked ? {} : { associationId: associationId || null }),
          dateOfBirth: dateOfBirth || null,
          heightCm: heightCm || null,
          weightKg: weightKg || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update profile");
      setSuccess("Profile saved.");
      await update();
      if (redirectTo) {
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {description && <p className="mt-2 text-sm text-text-secondary">{description}</p>}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-dark-600 bg-dark-800">
            {image ? (
              <Image src={image} alt="Profile" width={64} height={64} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">—</div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : image ? "Change photo" : "Add photo"}
            </Button>
            <p className="mt-1 text-xs text-text-muted">Optional</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Full name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Country</label>
          <CountryPicker value={countryCode} onChange={setCountryCode} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Football association</label>
          {associationLocked ? (
            <div className="flex h-11 items-center gap-2 rounded-lg border border-dark-600 bg-dark-800/60 px-4 text-sm text-text-secondary">
              <span>{flagEmoji(initialValues.associationCountryCode) || "🏳️"}</span>
              {initialValues.associationName}
              <span className="ml-auto text-xs text-text-muted">Managed by your association</span>
            </div>
          ) : (
            <Select
              value={associationId}
              onChange={(v) => setAssociationId(String(v))}
              options={associationOptions}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Date of birth</label>
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Height (cm)</label>
            <Input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="180"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Weight (kg)</label>
            <Input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="75"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </form>
    </div>
  );
}
