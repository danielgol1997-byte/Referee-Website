"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { CompactSpinner } from "@/components/ui/compact-spinner";
import { LAW_NUMBERS, formatLawLabel } from "@/lib/laws";

type PoolTest = {
  id: string;
  title: string;
  description: string | null;
  lawNumbers: number[];
  totalQuestions: number;
  passingScore: number | null;
  isUserGenerated?: boolean;
};

type CarouselTab = "public" | "user-generated";

const LAW_OPTIONS = LAW_NUMBERS.map((num) => ({ 
  value: num, 
  label: formatLawLabel(num) 
}));

export function PoolTestsCarousel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CarouselTab>("public");
  const [publicTests, setPublicTests] = useState<PoolTest[]>([]);
  const [userTests, setUserTests] = useState<PoolTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<PoolTest | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    lawNumbers: [] as number[],
    totalQuestions: 10,
  });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchPoolTests = async () => {
      try {
        const res = await fetch("/api/tests/laws/pool");
        if (res.ok) {
          const data = await res.json();
          const allTests = data.tests ?? [];
          
          // Separate tests into public and user-generated
          setPublicTests(allTests.filter((t: PoolTest) => !t.isUserGenerated));
          setUserTests(allTests.filter((t: PoolTest) => t.isUserGenerated));
        }
      } catch (err) {
        console.error("Failed to load pool tests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoolTests();
  }, []);

  // Reset index when switching tabs
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeTab]);

  const currentTests = activeTab === "public" ? publicTests : userTests;
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

  const startTest = async (test: PoolTest) => {
    setStartingTestId(test.id);
    try {
      const res = await fetch("/api/tests/laws/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandatoryTestId: test.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/laws/test/${data.session.id}`);
      }
    } catch (err) {
      console.error("Failed to start test:", err);
    } finally {
      setStartingTestId(null);
    }
  };

  const deleteUserTest = async (testId: string) => {
    if (!confirm("Delete this test? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/admin/mandatory-tests/${testId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setUserTests(prev => prev.filter(t => t.id !== testId));
        if (currentIndex >= userTests.length - 1) {
          setCurrentIndex(Math.max(0, userTests.length - 2));
        }
      }
    } catch (err) {
      console.error("Failed to delete test:", err);
    }
  };

  const openEditModal = (test: PoolTest) => {
    setEditingTest(test);
    setEditForm({
      title: test.title,
      description: test.description || "",
      lawNumbers: test.lawNumbers,
      totalQuestions: Math.max(5, Math.min(20, test.totalQuestions)),
    });
  };

  const closeEditModal = () => {
    setEditingTest(null);
  };

  const saveEdit = async () => {
    if (!editingTest) return;
    
    try {
      const res = await fetch(`/api/admin/mandatory-tests/${editingTest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          lawNumbers: editForm.lawNumbers,
          totalQuestions: editForm.totalQuestions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the test in the list
        setUserTests(prev => prev.map(t => t.id === editingTest.id ? data.test : t));
        closeEditModal();
      }
    } catch (err) {
      console.error("Failed to update test:", err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
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
          onClick={() => setActiveTab("user-generated")}
          className={`
            flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative
            ${activeTab === "user-generated" 
              ? "text-accent" 
              : "text-text-secondary hover:text-text-primary"
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Tests
          {userTests.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent border border-accent/30">
              {userTests.length}
            </span>
          )}
          {activeTab === "user-generated" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      </div>

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
          {activeTab === "user-generated" && (
            <p className="text-sm text-text-secondary mt-2">
              Use "Build Your Own Test" below to create one
            </p>
          )}
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
              {currentTests.map((test, index) => {
                // Calculate position relative to current index with proper wrapping
                let offset = index - currentIndex;
                
                // Normalize to handle wrapping (choose shortest path)
                if (offset > currentTests.length / 2) {
                  offset -= currentTests.length;
                } else if (offset < -currentTests.length / 2) {
                  offset += currentTests.length;
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
                    <TestCard
                      test={test}
                      onStart={startTest}
                      onEdit={offset === 0 && activeTab === "user-generated" ? openEditModal : undefined}
                      onDelete={offset === 0 && activeTab === "user-generated" ? deleteUserTest : undefined}
                      isStarting={startingTestId === test.id}
                      showActions={offset === 0}
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

          {/* Dots Indicator - Outside carousel container */}
          {hasMultiple && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-xs text-text-secondary mr-2">
                {currentIndex + 1} / {currentTests.length}
              </span>
              {currentTests.map((_, index) => (
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

      {/* Edit Modal */}
      {editingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit Test</h2>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Test title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Description</label>
                <textarea
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 text-white px-4 py-2.5 text-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Laws</label>
                <MultiSelect
                  value={editForm.lawNumbers}
                  onChange={(vals) => setEditForm({ ...editForm, lawNumbers: vals as number[] })}
                  options={LAW_OPTIONS}
                  placeholder="Add Law"
                />
                <p className="text-xs text-text-secondary">Leave empty to draw from all laws</p>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-white">Questions</label>
                <CompactSpinner
                  value={editForm.totalQuestions}
                  onChange={(val) => setEditForm({ ...editForm, totalQuestions: val })}
                  min={5}
                  max={20}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={saveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button onClick={closeEditModal} variant="secondary" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Extracted Test Card Component
function TestCard({ 
  test, 
  onStart, 
  onEdit,
  onDelete,
  isStarting, 
  showActions 
}: { 
  test: PoolTest; 
  onStart: (test: PoolTest) => void;
  onEdit?: (test: PoolTest) => void;
  onDelete?: (testId: string) => void;
  isStarting: boolean;
  showActions: boolean;
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

      {/* Edit/Delete Buttons - Top Right, Show on Hover */}
      {(onEdit || onDelete) && (
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
              onClick={() => onDelete(test.id)}
              className="p-2 rounded-lg bg-dark-900/90 backdrop-blur-sm border border-status-danger/30 text-status-danger hover:bg-status-danger hover:text-white transition-all"
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
          <h3 className="text-lg font-bold text-white leading-tight pr-16 min-h-[3.5rem]">
            {test.title}
          </h3>

          {/* Description - fixed height */}
          <div className="min-h-[2.5rem]">
            {test.description && (
              <p className="text-sm text-text-secondary line-clamp-2">
                {test.description}
              </p>
            )}
          </div>

          {/* Laws Badges - fixed height container */}
          <div className="min-h-[2rem]">
            {test.lawNumbers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {test.lawNumbers.map((num) => (
                  <span
                    key={num}
                    className="px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold"
                  >
                    Law {num}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Questions</p>
              <p className="text-xl font-bold text-accent">{test.totalQuestions}</p>
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
