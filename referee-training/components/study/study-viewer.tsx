"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Select } from "@/components/ui/select";
import Link from "next/link";

// Map law numbers to IFAB URLs (same as carousel)
const getLawUrl = (lawNumber: number): string => {
  const lawUrls: Record<number, string> = {
    1: "https://www.theifab.com/laws/latest/the-field-of-play/",
    2: "https://www.theifab.com/laws/latest/the-ball/",
    3: "https://www.theifab.com/laws/latest/the-players/",
    4: "https://www.theifab.com/laws/latest/the-players-equipment/",
    5: "https://www.theifab.com/laws/latest/the-referee/",
    6: "https://www.theifab.com/laws/latest/the-other-match-officials/",
    7: "https://www.theifab.com/laws/latest/the-duration-of-the-match/",
    8: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/",
    9: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/",
    10: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/",
    11: "https://www.theifab.com/laws/latest/offside/",
    12: "https://www.theifab.com/laws/latest/fouls-and-misconduct/",
    13: "https://www.theifab.com/laws/latest/free-kicks/",
    14: "https://www.theifab.com/laws/latest/the-penalty-kick/",
    15: "https://www.theifab.com/laws/latest/the-throw-in/",
    16: "https://www.theifab.com/laws/latest/the-goal-kick/",
    17: "https://www.theifab.com/laws/latest/the-corner-kick/",
  };
  return lawUrls[lawNumber] || "#";
};

type AnswerOption = {
  id: string;
  label: string;
  code: string;
  isCorrect: boolean;
};

type Question = {
  id: string;
  text: string;
  explanation: string;
  lawNumbers: number[];
  answerOptions: AnswerOption[];
  isRead: boolean;
  readAt: string | Date | null;
};

export function StudyViewer() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allLawNumbers, setAllLawNumbers] = useState<number[]>([]); // Store all available law numbers
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lawFilter, setLawFilter] = useState<number[]>([]); // Array of selected law numbers
  const [readFilter, setReadFilter] = useState<string>("all");
  const [includeVar, setIncludeVar] = useState(false);
  const [isLawDropdownOpen, setIsLawDropdownOpen] = useState(false);
  const lawDropdownRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [tempPosition, setTempPosition] = useState(0);
  const tempPositionRef = useRef(0); // Use ref to avoid effect re-runs
  const carouselRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Track fetch requests

  // Fetch all law numbers once on mount (for filter dropdown)
  useEffect(() => {
    const fetchAllLawNumbers = async () => {
      try {
        const res = await fetch('/api/study/questions?readStatus=all');
        if (res.ok) {
          const data = await res.json();
          // Extract all unique law numbers from all questions (questions can have multiple laws)
          const allLaws = new Set<number>();
          data.questions.forEach((q: Question) => {
            if (q.lawNumbers && Array.isArray(q.lawNumbers)) {
              q.lawNumbers.forEach((lawNum: number) => allLaws.add(lawNum));
            }
          });
          const numbers = Array.from(allLaws).sort((a, b) => a - b);
          setAllLawNumbers(numbers);
        }
      } catch (err) {
        console.error("Error fetching law numbers:", err);
      }
    };
    fetchAllLawNumbers();
  }, []);

  // Close law dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lawDropdownRef.current && !lawDropdownRef.current.contains(event.target as Node)) {
        setIsLawDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLawDropdownOpen(false);
      }
    };

    if (isLawDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isLawDropdownOpen]);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (lawFilter.length > 0) {
        // Send multiple law numbers as comma-separated string
        params.append("lawNumbers", lawFilter.join(","));
      }
      if (readFilter !== "all") params.append("readStatus", readFilter);
      if (includeVar) params.append("includeVar", "true");

      const res = await fetch(`/api/study/questions?${params}`, {
        signal: abortController.signal,
      });
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData?.error ?? `Failed to load questions (${res.status})`;
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      
      // Check again if request was aborted before updating state
      if (abortController.signal.aborted) {
        return;
      }
      
      const questionsData = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(questionsData);
      setFilteredQuestions(questionsData);
      setCurrent(0);
      setShowAnswer(false);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error("Error fetching questions:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load questions";
      setError(errorMessage);
    } finally {
      // Only update loading state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [lawFilter, readFilter, includeVar]);

  useEffect(() => {
    fetchQuestions();
    
    // Cleanup: abort request on unmount or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchQuestions]);

  // Ensure current index is valid when filteredQuestions changes
  useEffect(() => {
    if (filteredQuestions.length > 0 && current >= filteredQuestions.length) {
      setCurrent(0);
      setShowAnswer(false);
    }
  }, [filteredQuestions.length, current]);

  const currentQuestion = filteredQuestions[current];
  const isFirst = current === 0;
  const isLast = current === filteredQuestions.length - 1;
  const readCount = filteredQuestions.filter((q) => q.isRead).length;

  const markAsRead = async (questionId: string) => {
    try {
      const res = await fetch("/api/study/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      
      // Only update local state if the request succeeded
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to mark as read:", errorData?.error ?? `HTTP ${res.status}`);
        return;
      }
      
      // Update local state only after successful API response
      setFilteredQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, isRead: true, readAt: new Date() } : q
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
      // Don't update state on network errors
    }
  };

  const handleRevealAnswer = () => {
    setShowAnswer(true);
    if (currentQuestion && !currentQuestion.isRead) {
      markAsRead(currentQuestion.id);
    }
  };

  const goNext = () => {
    if (!isLast) {
      setCurrent((idx) => idx + 1);
      setShowAnswer(false);
    }
  };

  const goPrevious = () => {
    if (!isFirst) {
      setCurrent((idx) => idx - 1);
      setShowAnswer(false);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrent(index);
    setShowAnswer(false);
  };

  const handleResetAll = async () => {
    if (!confirm("Are you sure you want to mark all questions as unread?")) {
      return;
    }
    
    try {
      await fetch("/api/study/progress", {
        method: "DELETE",
      });
      fetchQuestions();
    } catch (error) {
      console.error("Failed to reset progress:", error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragOffset(0);
    setTempPosition(current);
    tempPositionRef.current = current; // Sync ref with state
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStart;
      setDragOffset(delta);
      
      const fractionalOffset = -delta / 80;
      const newPosition = current + fractionalOffset;
      const clampedPosition = Math.max(0, Math.min(filteredQuestions.length - 1, newPosition));
      setTempPosition(clampedPosition);
      tempPositionRef.current = clampedPosition; // Update ref
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const snappedIndex = Math.round(tempPositionRef.current); // Read from ref
      const finalIndex = Math.max(0, Math.min(filteredQuestions.length - 1, snappedIndex));
      setCurrent(finalIndex);
      setShowAnswer(false);
      setDragOffset(0);
      setTempPosition(finalIndex);
      tempPositionRef.current = finalIndex; // Sync ref
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, current, filteredQuestions.length]); // Removed tempPosition from deps

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-900/20 border border-red-500/30">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const toggleLaw = (lawNumber: number) => {
    setLawFilter((prev) => {
      if (prev.includes(lawNumber)) {
        return prev.filter((num) => num !== lawNumber);
      } else {
        return [...prev, lawNumber].sort((a, b) => a - b);
      }
    });
    // Keep dropdown open to allow multiple selections
  };

  const clearAllLaws = () => {
    setLawFilter([]);
  };

  const readOptions = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-dark-700 to-dark-800 p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Law Filter - Multi-select */}
          <div className="relative" ref={lawDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLawDropdownOpen(!isLawDropdownOpen)}
              className="w-48 flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-left bg-dark-900 border border-cyan-500/20 text-white hover:border-cyan-500/50 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
            >
              <span className={lawFilter.length === 0 ? "text-text-muted" : ""}>
                {lawFilter.length === 0 ? "Select Laws" : `${lawFilter.length} selected`}
              </span>
              <svg 
                className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isLawDropdownOpen ? "rotate-180" : ""}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isLawDropdownOpen && (
              <div className="absolute top-full mt-2 z-50 w-48 rounded-lg border border-dark-600 bg-dark-800 shadow-elevated animate-in fade-in-0 zoom-in-95 duration-200 max-h-60 overflow-auto">
                <div className="p-1">
                  {/* Reset button - show when more than one law is selected */}
                  {lawFilter.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          clearAllLaws();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors text-left text-text-secondary hover:text-white hover:bg-dark-700 border-b border-dark-600 mb-1"
                      >
                        <span>Reset</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <div className="border-b border-dark-600 mb-1" />
                    </>
                  )}
                  
                  {/* All laws with checkmarks */}
                  {allLawNumbers.map((num) => {
                    const isSelected = lawFilter.includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          toggleLaw(num);
                        }}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors text-left
                          ${isSelected 
                            ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" 
                            : "text-text-secondary hover:text-white hover:bg-dark-700"
                          }
                        `}
                      >
                        <span>Law {num}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Read/Unread Filter */}
          <div className="w-40">
            <Select
              value={readFilter}
              onChange={(val) => setReadFilter(String(val))}
              options={readOptions}
              className="[&>button]:border-cyan-500/20 [&>button]:hover:border-cyan-500/50 [&>button]:focus:border-cyan-500/50 [&>button]:focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex-1" />

          {/* VAR Toggle Switch */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary cursor-pointer select-none" htmlFor="includeVar">
              Include VAR
            </label>
            <button
              id="includeVar"
              type="button"
              onClick={() => setIncludeVar(!includeVar)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-dark-900 ${
                includeVar ? "bg-cyan-500" : "bg-dark-600"
              }`}
              role="switch"
              aria-checked={includeVar}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  includeVar ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Mark All as Unread Button */}
          <button
            onClick={handleResetAll}
            className="px-4 py-2 rounded-lg bg-dark-800 border border-cyan-500/20 text-text-secondary hover:text-white hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Mark all as unread
          </button>
        </div>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">No questions found</p>
          <button
            onClick={() => {
              setLawFilter([]);
              setReadFilter("all");
            }}
            className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white hover:border-cyan-500/50 transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Question {current + 1}{" "}
                <span className="text-text-secondary">/ {filteredQuestions.length}</span>
              </h2>
              <div className="text-sm text-text-secondary">
                {readCount} of {filteredQuestions.length} read
              </div>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${(readCount / filteredQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          {currentQuestion && (
            <div className="rounded-xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden">
              <div className="p-8 space-y-6">
                {/* Law Number Badges */}
                {currentQuestion.lawNumbers && currentQuestion.lawNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.lawNumbers.map((lawNum) => (
                      <Link
                        key={lawNum}
                        href={getLawUrl(lawNum)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium text-cyan-400 group-hover:text-cyan-300">Law {lawNum}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Question Text */}
                <h3 className="text-xl font-semibold text-white leading-relaxed">
                  {currentQuestion.text}
                </h3>

                {/* Reveal Answer Button / Explanation */}
                {!showAnswer ? (
                  <button
                    onClick={handleRevealAnswer}
                    className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Show Answer
                  </button>
                ) : (
                  <div className="p-6 rounded-xl bg-cyan-900/20 border border-cyan-500/30">
                    <p className="text-white leading-relaxed">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Question Navigation Carousel */}
          <div className="relative" style={{ height: "100px" }}>
            <div
              ref={carouselRef}
              className={`relative flex items-center justify-center ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              onMouseDown={handleMouseDown}
              style={{
                perspective: "1000px",
                height: "100px",
                userSelect: "none",
              }}
            >
              <div className="relative w-full max-w-md mx-auto" style={{ height: "80px" }}>
                {filteredQuestions.map((_, index) => {
                  const basePosition = isDragging ? tempPosition : current;
                  const offset = index - basePosition;

                  if (Math.abs(offset) > 4) return null;

                  let translateX = offset * 80;
                  let translateZ = -Math.abs(offset) * 50;
                  let scale = 1 - Math.abs(offset) * 0.15;
                  let opacity = Math.max(0.2, 1 - Math.abs(offset) * 0.25);
                  let zIndex = 30 - Math.abs(offset) * 5;

                  const question = filteredQuestions[index];
                  const isCurrent = !isDragging && index === current;
                  const isNearlyCurrent = isDragging && Math.abs(offset) < 0.3;

                  return (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (Math.abs(dragOffset) < 5) {
                          goToQuestion(index);
                        }
                      }}
                      className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-16 h-16 rounded-xl text-lg font-bold
                        ${
                          isCurrent || isNearlyCurrent
                            ? "bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-2xl shadow-cyan-500/40"
                            : question.isRead
                            ? "bg-dark-700 text-white border-2 border-cyan-500/50 hover:border-cyan-500 hover:scale-110 shadow-lg shadow-cyan-500/20 cursor-pointer"
                            : "bg-dark-800 text-text-secondary border-2 border-dark-600 hover:border-cyan-500/30 hover:scale-110 cursor-pointer"
                        }
                      `}
                      style={{
                        transform: `
                          translateX(calc(-50% + ${translateX}px))
                          translateY(-50%)
                          translateZ(${translateZ}px)
                          scale(${scale})
                        `,
                        opacity,
                        zIndex,
                        transformStyle: "preserve-3d",
                        transition: isDragging
                          ? "none"
                          : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      title={`Question ${index + 1}${question.isRead ? " (read)" : ""}`}
                    >
                      {/* Checkmark for read questions */}
                      {question.isRead && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 border-2 border-dark-900 flex items-center justify-center shadow-lg">
                          <svg
                            className="w-3 h-3 text-dark-900"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                      {index + 1}
                    </button>
                  );
                })}
              </div>

          {/* Navigation Arrows */}
          <button
            onClick={goPrevious}
            disabled={isFirst}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-dark-900/90 border border-dark-600 text-white hover:bg-dark-800 hover:border-cyan-500/30 hover:scale-110 transition-all shadow-lg backdrop-blur-sm disabled:opacity-30 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={goNext}
            disabled={isLast}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-dark-900/90 border border-dark-600 text-white hover:bg-dark-800 hover:border-cyan-500/30 hover:scale-110 transition-all shadow-lg backdrop-blur-sm disabled:opacity-30 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

