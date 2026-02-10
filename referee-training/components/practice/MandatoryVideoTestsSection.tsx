"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoTestCard, type VideoTestCardData } from "./VideoTestCard";

type MandatoryVideoTest = VideoTestCardData & {
  dueDate?: string | null;
  completed?: boolean;
};

export function MandatoryVideoTestsSection() {
  const router = useRouter();
  const [tests, setTests] = useState<MandatoryVideoTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/tests/videos/mandatory")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.tests) setTests(data.tests);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const formatDueDate = (dueDate: string | null | undefined) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Due Tomorrow";
    return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const startTest = async (test: VideoTestCardData) => {
    setStartingTestId(test.id);
    setError(null);
    try {
      const res = await fetch("/api/tests/videos/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoTestId: test.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not start test");
      router.push(`/practice/video-tests/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start test");
    } finally {
      setStartingTestId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-status-dangerBg border border-status-danger/30">
        <p className="text-sm text-status-danger">{error}</p>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <p className="text-text-secondary text-center py-8">No mandatory video tests at the moment.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tests.map((test) => (
        <VideoTestCard
          key={test.id}
          test={test}
          onStart={startTest}
          isStarting={startingTestId === test.id}
          dueDateLabel={formatDueDate(test.dueDate)}
        />
      ))}
    </div>
  );
}
