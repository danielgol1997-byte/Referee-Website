"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type VideoTestCardData } from "./VideoTestCard";
import { Button } from "@/components/ui/button";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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

  const hasMultiple = tests.length > 1;

  const goToPrevious = () => {
    if (isAnimating || tests.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? tests.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToNext = () => {
    if (isAnimating || tests.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === tests.length - 1 ? 0 : prev + 1));
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
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-600/50 mb-4">
          <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-text-secondary">No mandatory video tests at the moment.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 3D Carousel Container */}
      <div
        className="relative flex items-center justify-center"
        style={{ perspective: "1200px", height: "420px" }}
      >
        <div className="relative w-full max-w-xs mx-auto" style={{ height: "400px" }}>
          {tests.map((test, index) => {
            let offset = index - currentIndex;
            if (offset > tests.length / 2) offset -= tests.length;
            else if (offset < -tests.length / 2) offset += tests.length;

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
            const dueDateLabel = formatDueDate(test.dueDate);

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
                {/* Card */}
                <div
                  className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  style={{
                    background: "linear-gradient(135deg, #131D35 0%, #0E1628 100%)",
                    boxShadow: isCurrent
                      ? "0 20px 60px rgba(0, 0, 0, 0.5)"
                      : "0 8px 32px rgba(0, 0, 0, 0.4)",
                    minHeight: "400px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {isCurrent && (
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}

                  <div className="relative p-6 space-y-4 flex flex-col flex-1">
                    <div className="flex-1 space-y-4">
                      <h3 className="text-lg font-bold text-white leading-tight min-h-[3.5rem] line-clamp-2">
                        {test.name}
                      </h3>

                      <div className="min-h-[2.5rem]">
                        {test.description && (
                          <p className="text-sm text-text-secondary line-clamp-2">{test.description}</p>
                        )}
                      </div>

                      {/* Due date badge */}
                      {dueDateLabel && (
                        <div className="min-h-[2rem]">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white border border-red-500/30"
                            style={{ backgroundColor: "#FF1744" }}
                          >
                            {dueDateLabel}
                          </span>
                        </div>
                      )}

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

                    {isCurrent && (
                      <div className="mt-auto pt-4">
                        <Button
                          onClick={() => startTest(test)}
                          disabled={startingTestId === test.id}
                          className="w-full relative overflow-hidden group/btn"
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {startingTestId === test.id ? (
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

                  {isCurrent && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
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
            {currentIndex + 1} / {tests.length}
          </span>
          {tests.length <= 20 ? (
            tests.map((_, index) => (
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
  );
}
