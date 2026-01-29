"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type MandatoryTest = {
  id: string;
  title: string;
  description?: string | null;
  lawNumbers: number[];
  totalQuestions: number;
  passingScore?: number | null;
  dueDate?: string | null;
  isActive: boolean;
  includeVar?: boolean;
  includeIfab?: boolean;
  includeCustom?: boolean;
};

export function MandatoryTestsSection() {
  const router = useRouter();
  const [tests, setTests] = useState<MandatoryTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tests/laws/mandatory");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not load mandatory tests");
      setTests(data.tests ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load mandatory tests";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const startMandatoryTest = async (test: MandatoryTest) => {
    setStartingTestId(test.id);
    setError(null);
    try {
      const res = await fetch("/api/tests/laws/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawNumbers: test.lawNumbers.length > 0 ? test.lawNumbers : undefined,
          totalQuestions: test.totalQuestions,
          mandatoryTestId: test.id,
          includeVar: test.includeVar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not start mandatory test");
      router.push(`/laws/test/${data.session.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start mandatory test";
      setError(message);
    } finally {
      setStartingTestId(null);
    }
  };

  const isTestDueSoon = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

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

  return (
    <div className="space-y-4">
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="p-4 rounded-lg bg-status-dangerBg border border-status-danger/30">
          <p className="text-sm text-status-danger">{error}</p>
        </div>
      )}

      {!loading && tests.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-600/50 mb-4">
            <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-text-secondary">No mandatory tests assigned</p>
        </div>
      ) : (
        <div className="relative">
          {/* 3D Carousel Container */}
          <div 
            className="relative flex items-center justify-center"
            style={{ 
              perspective: '1200px',
              height: '420px',
            }}
          >
            {/* Cards Container */}
            <div className="relative w-full max-w-xs mx-auto" style={{ height: '400px' }}>
              {tests.map((test, index) => {
                // Calculate position relative to current index with proper wrapping
                let offset = index - currentIndex;
                
                // Normalize to handle wrapping (choose shortest path)
                if (offset > tests.length / 2) {
                  offset -= tests.length;
                } else if (offset < -tests.length / 2) {
                  offset += tests.length;
                }
                
                // Transform values based on offset - position all cards in circular arrangement
                let translateX = 0;
                let rotateY = 0;
                let translateZ = 0;
                let scale = 1;
                let opacity = 1;
                let zIndex = 10;

                if (offset === 0) {
                  // Center card
                  translateX = 0;
                  rotateY = 0;
                  translateZ = 50;
                  scale = 1;
                  opacity = 1;
                  zIndex = 30;
                } else if (offset === -1) {
                  // Left card
                  translateX = -65;
                  rotateY = 35;
                  translateZ = -50;
                  scale = 0.85;
                  opacity = 0.5;
                  zIndex = 20;
                } else if (offset === 1) {
                  // Right card
                  translateX = 65;
                  rotateY = -35;
                  translateZ = -50;
                  scale = 0.85;
                  opacity = 0.5;
                  zIndex = 20;
                } else if (offset === -2) {
                  // Far left (behind and to the left)
                  translateX = -85;
                  rotateY = 65;
                  translateZ = -120;
                  scale = 0.7;
                  opacity = 0;
                  zIndex = 5;
                } else if (offset === 2) {
                  // Far right (behind and to the right)
                  translateX = 85;
                  rotateY = -65;
                  translateZ = -120;
                  scale = 0.7;
                  opacity = 0;
                  zIndex = 5;
                } else {
                  // Cards further back (hidden completely)
                  translateX = offset > 0 ? 100 : -100;
                  rotateY = offset > 0 ? -80 : 80;
                  translateZ = -180;
                  scale = 0.6;
                  opacity = 0;
                  zIndex = 0;
                }

                const dueLabel = formatDueDate(test.dueDate);
                const isDueSoon = isTestDueSoon(test.dueDate);

                return (
                  <div
                    key={test.id}
                    className="absolute inset-0"
                    style={{
                      transform: `
                        translateX(${translateX}%)
                        rotateY(${rotateY}deg)
                        translateZ(${translateZ}px)
                        scale(${scale})
                      `,
                      opacity,
                      zIndex,
                      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      pointerEvents: offset === 0 ? 'auto' : 'none',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <MandatoryTestCard
                      test={test}
                      onStart={startMandatoryTest}
                      isStarting={startingTestId === test.id}
                      showActions={offset === 0}
                      dueLabel={dueLabel}
                      isDueSoon={isDueSoon}
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
                {currentIndex + 1} / {tests.length}
              </span>
              {tests.map((_, index) => (
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Extracted Mandatory Test Card Component
function MandatoryTestCard({ 
  test, 
  onStart, 
  isStarting, 
  showActions,
  dueLabel,
  isDueSoon
}: { 
  test: MandatoryTest; 
  onStart: (test: MandatoryTest) => void;
  isStarting: boolean;
  showActions: boolean;
  dueLabel: string | null;
  isDueSoon: boolean;
}) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #131D35 0%, #0E1628 100%)",
        boxShadow: showActions ? "0 20px 60px rgba(0, 0, 0, 0.5)" : "0 8px 32px rgba(0, 0, 0, 0.4)",
        minHeight: '420px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 3D Card Effect - Shine */}
      {showActions && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Due Date Badge */}
      {dueLabel && (
        <div className="absolute top-3 right-3 z-20">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm text-white border border-red-500/30 shadow-lg shadow-red-500/30`} style={{ backgroundColor: '#FF1744' }}>
            {dueLabel}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative p-6 space-y-4 flex flex-col flex-1">
        <div className="flex-1 space-y-4">
          {/* Title */}
          <h3 className="text-lg font-bold text-white leading-tight pr-16 min-h-[3.5rem]">
            {test.title}
          </h3>

          {/* Description */}
          <div className="min-h-[2.5rem]">
            {test.description && (
              <p className="text-sm text-text-secondary line-clamp-2">
                {test.description}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Questions</p>
              <p className="text-xl font-bold text-accent">{test.totalQuestions}</p>
            </div>
            {test.passingScore && (
              <div className="space-y-1">
                <p className="text-xs text-text-secondary uppercase tracking-wider">Pass Mark</p>
                <p className="text-xl font-bold text-accent">{test.passingScore}</p>
              </div>
            )}
          </div>

          {/* Question Source Badge */}
          <div className="flex items-center gap-2 pt-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              test.includeIfab && test.includeCustom
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : !test.includeIfab && test.includeCustom
                ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                : "bg-green-500/10 border-green-500/30 text-green-400"
            }`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {test.includeIfab && test.includeCustom
                ? "IFAB & Custom" 
                : !test.includeIfab && test.includeCustom
                ? "Custom Only" 
                : "IFAB Only"}
            </div>
          </div>
        </div>

        {/* Start Button - anchored at bottom */}
        {showActions && (
          <div className="mt-auto pt-4">
            <Button
              onClick={() => onStart(test)}
              disabled={isStarting}
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
