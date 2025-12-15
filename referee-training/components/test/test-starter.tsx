"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type TestStarterProps = {
  endpoint: string;
  redirectBase: string; // e.g. "/laws/test"
  label?: string;
  payload?: Record<string, unknown>;
};

export function TestStarter({ endpoint, redirectBase, label = "Start practice", payload }: TestStarterProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not start test");
        setLoading(false);
        return;
      }
      router.push(`${redirectBase}/${data.session.id}`);
    } catch {
      setError("Could not start test");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={start} disabled={loading}>
        {loading ? "Starting..." : label}
      </Button>
      {error ? <p className="text-sm text-status-danger">{error}</p> : null}
    </div>
  );
}

