"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type VideoTestCardData } from "./VideoTestCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal";

export function PoolVideoTestsSection({
  refreshKey = 0,
  focusMyTestId,
}: {
  refreshKey?: number;
  focusMyTestId?: string | null;
}) {
  const modal = useModal();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"public" | "my">("public");
  const [publicTests, setPublicTests] = useState<VideoTestCardData[]>([]);
  const [myTests, setMyTests] = useState<VideoTestCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<VideoTestCardData | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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

  useEffect(() => {
    if (!focusMyTestId) return;
    setActiveTab("my");
  }, [focusMyTestId]);

  // Reset carousel index when switching tabs
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeTab]);

  // Focus on newly created test
  useEffect(() => {
    if (!focusMyTestId || activeTab !== "my") return;
    const idx = myTests.findIndex((t) => t.id === focusMyTestId);
    if (idx >= 0) setCurrentIndex(idx);
  }, [focusMyTestId, activeTab, myTests]);

  const currentTests = activeTab === "public" ? publicTests : myTests;
  const currentTest = currentTests[currentIndex];
  const hasMultiple = currentTests.length > 1;

  const goToPrevious = () => {
    if (isAnimating || currentTests.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? currentTests.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToNext = () => {
    if (isAnimating || currentTests.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === currentTests.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
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

  const openEdit = (test: VideoTestCardData) => {
    setEditName(test.name);
    setEditDescription(test.description ?? "");
    setEditingTest(test);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingTest) return;
    if (!editName.trim()) {
      setError("Test name cannot be empty.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/videos/user/${editingTest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update test");
      setMyTests((prev) => prev.map((t) => (t.id === editingTest.id ? { ...t, ...data.test } : t)));
      setEditingTest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteTest = async (test: VideoTestCardData) => {
    const confirmed = await modal.showConfirm(
      `Are you sure you want to delete "${test.name}"?`,
      "Delete Video Test",
      "warning"
    );
    if (!confirmed) return;
    setDeletingTestId(test.id);
    setError(null);
    try {
      const res = await fetch(`/api/tests/videos/user/${test.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete test");
      setMyTests((prev) => prev.filter((t) => t.id !== test.id));
      // Adjust index if needed
      setCurrentIndex((prev) => Math.min(prev, Math.max(0, myTests.length - 2)));
      await modal.showSuccess("Video test deleted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test");
      await modal.showError("Failed to delete test");
    } finally {
      setDeletingTestId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !publicTests.length && !myTests.length) {
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

  return (
    <div className="space-y-6">
      {/* Sub-Tabs for Public/My Tests */}
      <div className="flex gap-2 border-b border-dark-600">
        <button
          onClick={() => setActiveTab("public")}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative ${
            activeTab === "public" ? "text-accent" : "text-text-secondary hover:text-text-primary"
          }`}
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
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative ${
            activeTab === "my" ? "text-accent" : "text-text-secondary hover:text-text-primary"
          }`}
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

      {error && (
        <div className="p-3 rounded-lg bg-status-dangerBg border border-status-danger/30">
          <p className="text-sm text-status-danger">{error}</p>
        </div>
      )}

      {/* Carousel Content */}
      {currentTests.length === 0 ? (
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
              Use the Create Your Test tab to create one
            </p>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* 3D Carousel Container */}
          <div
            className="relative flex items-center justify-center"
            style={{ perspective: "1200px", height: "380px" }}
          >
            <div className="relative w-full max-w-xs mx-auto" style={{ height: "360px" }}>
              {currentTests.map((test, index) => {
                let offset = index - currentIndex;
                if (offset > currentTests.length / 2) offset -= currentTests.length;
                else if (offset < -currentTests.length / 2) offset += currentTests.length;

                let translateX = 0;
                let rotateY = 0;
                let translateZ = 0;
                let scale = 1;
                let opacity = 1;
                let zIndex = 10;

                if (offset === 0) {
                  translateX = 0; rotateY = 0; translateZ = 50; scale = 1; opacity = 1; zIndex = 30;
                } else if (offset === -1) {
                  translateX = -65; rotateY = 35; translateZ = -50; scale = 0.85; opacity = 0.5; zIndex = 20;
                } else if (offset === 1) {
                  translateX = 65; rotateY = -35; translateZ = -50; scale = 0.85; opacity = 0.5; zIndex = 20;
                } else if (offset === -2) {
                  translateX = -85; rotateY = 65; translateZ = -120; scale = 0.7; opacity = 0; zIndex = 5;
                } else if (offset === 2) {
                  translateX = 85; rotateY = -65; translateZ = -120; scale = 0.7; opacity = 0; zIndex = 5;
                } else {
                  translateX = offset > 0 ? 100 : -100;
                  rotateY = offset > 0 ? -80 : 80;
                  translateZ = -180; scale = 0.6; opacity = 0; zIndex = 0;
                }

                const isCurrent = offset === 0;

                return (
                  <div
                    key={test.id}
                    className="absolute inset-0"
                    style={{
                      transform: `translateX(${translateX}%) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`,
                      opacity,
                      zIndex,
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      pointerEvents: isCurrent ? "auto" : "none",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <VideoTestCarouselCard
                      test={test}
                      onStart={startTest}
                      isStarting={startingTestId === test.id}
                      showActions={isCurrent}
                      canManage={activeTab === "my" && isCurrent}
                      onEdit={activeTab === "my" ? openEdit : undefined}
                      onDelete={activeTab === "my" ? deleteTest : undefined}
                      isDeleting={deletingTestId === test.id}
                    />
                  </div>
                );
              })}
            </div>

            {/* Navigation Arrows */}
            {hasMultiple && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={isAnimating}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-dark-900/90 border border-dark-600 text-white hover:bg-dark-800 hover:border-accent/30 hover:scale-110 transition-all shadow-lg backdrop-blur-sm disabled:opacity-50"
                  title="Previous test"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNext}
                  disabled={isAnimating}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-dark-900/90 border border-dark-600 text-white hover:bg-dark-800 hover:border-accent/30 hover:scale-110 transition-all shadow-lg backdrop-blur-sm disabled:opacity-50"
                  title="Next test"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Dots Indicator */}
          {hasMultiple && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-xs text-text-secondary mr-2">
                {currentIndex + 1} / {currentTests.length}
              </span>
              {currentTests.length <= 20 ? (
                currentTests.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isAnimating) {
                        setIsAnimating(true);
                        setCurrentIndex(index);
                        setTimeout(() => setIsAnimating(false), 500);
                      }
                    }}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? "w-6 bg-accent shadow-lg shadow-accent/30"
                        : "w-2 bg-dark-600 hover:bg-dark-500"
                    }`}
                    title={`Go to test ${index + 1}`}
                  />
                ))
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingTest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit test</h3>
              <button
                onClick={() => setEditingTest(null)}
                className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-dark-800 border-dark-600 text-white"
                placeholder="Test name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-dark-800 border-dark-600 text-white"
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditingTest(null)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button type="button" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   3D Carousel Card (matches Laws TestCard)
   ───────────────────────────────────────────── */
function VideoTestCarouselCard({
  test,
  onStart,
  isStarting,
  showActions,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
}: {
  test: VideoTestCardData;
  onStart: (test: VideoTestCardData) => void;
  isStarting: boolean;
  showActions: boolean;
  canManage?: boolean;
  onEdit?: (test: VideoTestCardData) => void;
  onDelete?: (test: VideoTestCardData) => void;
  isDeleting?: boolean;
}) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #131D35 0%, #0E1628 100%)",
        boxShadow: showActions ? "0 20px 60px rgba(0, 0, 0, 0.5)" : "0 8px 32px rgba(0, 0, 0, 0.4)",
        minHeight: "360px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Shine effect */}
      {showActions && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Edit/Delete Buttons - Top Right */}
      {canManage && (onEdit || onDelete) && (
        <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              onClick={() => onEdit(test)}
              className="p-2 rounded-lg bg-dark-900/90 backdrop-blur-sm border border-dark-600 text-accent hover:bg-accent/20 hover:border-accent/50 transition-all"
              title="Edit test"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(test)}
              disabled={isDeleting}
              className="p-2 rounded-lg bg-dark-900/90 backdrop-blur-sm border border-status-danger/30 text-status-danger hover:bg-status-danger hover:text-white transition-all disabled:opacity-50"
              title="Delete test"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative p-6 space-y-4 flex flex-col flex-1">
        <div className="flex-1 space-y-4">
          {/* Title */}
          <h3 className="text-lg font-bold text-white leading-tight pr-12 min-h-[3.5rem] line-clamp-2">
            {test.name}
          </h3>

          {/* Description */}
          <div className="min-h-[2.5rem]">
            {test.description && (
              <p className="text-sm text-text-secondary line-clamp-2">{test.description}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Videos</p>
              <p className="text-xl font-bold text-accent">{test.totalClips}</p>
            </div>
            {test.passingScore !== null && test.passingScore !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-text-secondary uppercase tracking-wider">Pass mark</p>
                <p className="text-xl font-bold text-accent">{test.passingScore}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Start Button */}
        {showActions && (
          <div className="mt-auto pt-4">
            <Button
              onClick={() => onStart(test)}
              disabled={isStarting || isDeleting}
              className="w-full relative overflow-hidden group/btn"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isStarting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Test
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent via-cyan-400 to-accent opacity-0 group-hover/btn:opacity-20 transition-opacity" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Accent Line */}
      {showActions && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}
