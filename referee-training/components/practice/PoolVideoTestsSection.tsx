"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoTestCard, type VideoTestCardData } from "./VideoTestCard";

export function PoolVideoTestsSection({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"public" | "my">("public");
  const [publicTests, setPublicTests] = useState<VideoTestCardData[]>([]);
  const [myTests, setMyTests] = useState<VideoTestCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/tests/videos/pool")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPublicTests(data.public ?? []);
          setMyTests(data.myTests ?? []);
          // If no public tests but my tests exist, switch tab
          if ((!data.public || data.public.length === 0) && data.myTests?.length > 0) {
            setActiveTab("my");
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

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

  const hasPublic = publicTests.length > 0;
  const hasMy = myTests.length > 0;

  if (!hasPublic && !hasMy) {
    return (
      <p className="text-text-secondary text-center py-8">No public or saved tests. Create one from the library or wait for admins to add public tests.</p>
    );
  }

  const currentTests = activeTab === "public" ? publicTests : myTests;

  return (
    <div className="space-y-6">
      {/* Sub-Tabs for Public/My Tests */}
      <div className="flex gap-2 border-b border-dark-600">
        <button
          onClick={() => setActiveTab("public")}
          className={`
            flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative
            ${activeTab === "public" 
              ? "text-accent" 
              : "text-text-secondary hover:text-text-primary"
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          Public Tests
          {publicTests.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent border border-accent/30">
              {publicTests.length}
            </span>
          )}
          {activeTab === "public" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
        
        <button
          onClick={() => setActiveTab("my")}
          className={`
            flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative
            ${activeTab === "my" 
              ? "text-accent" 
              : "text-text-secondary hover:text-text-primary"
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Tests
          {myTests.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent border border-accent/30">
              {myTests.length}
            </span>
          )}
          {activeTab === "my" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {currentTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentTests.map((test) => (
              <VideoTestCard
                key={test.id}
                test={test}
                onStart={startTest}
                isStarting={startingTestId === test.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-600/50 mb-4">
              <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-text-secondary">
              {activeTab === "public" ? "No public tests available" : "No custom tests yet"}
            </p>
            {activeTab === "my" && (
              <p className="text-sm text-text-secondary mt-2">
                Use "Create Your Test" tab to create one
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
