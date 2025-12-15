"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Select } from "@/components/ui/select";

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
  lawNumber: number | null;
  answerOptions: AnswerOption[];
  isRead: boolean;
  readAt: string | Date | null;
};

export function StudyViewer() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lawFilter, setLawFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [tempPosition, setTempPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (lawFilter !== "all") params.append("lawNumber", lawFilter);
      if (readFilter !== "all") params.append("readStatus", readFilter);

      const res = await fetch(`/api/study/questions?${params}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData?.error ?? `Failed to load questions (${res.status})`;
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      const questionsData = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(questionsData);
      setFilteredQuestions(questionsData);
      setCurrent(0);
      setShowAnswer(false);
    } catch (err) {
      console.error("Error fetching questions:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load questions";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [lawFilter, readFilter]);

  useEffect(() => {
    fetchQuestions();
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
      await fetch("/api/study/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      
      // Update local state
      setFilteredQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, isRead: true, readAt: new Date() } : q
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
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
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const snappedIndex = Math.round(tempPosition);
      const finalIndex = Math.max(0, Math.min(filteredQuestions.length - 1, snappedIndex));
      setCurrent(finalIndex);
      setShowAnswer(false);
      setDragOffset(0);
      setTempPosition(finalIndex);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, current, filteredQuestions.length, tempPosition]);

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

  // Get unique law numbers for filter
  const lawNumbers = Array.from(
    new Set(questions.map((q) => q.lawNumber).filter((n) => n !== null))
  ).sort((a, b) => (a ?? 0) - (b ?? 0));

  const lawOptions = [
    { value: "all", label: "All Laws" },
    ...lawNumbers.map((num) => ({ value: String(num), label: `Law ${num}` })),
  ];

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
          {/* Law Filter */}
          <div className="w-48">
            <Select
              value={lawFilter}
              onChange={(val) => setLawFilter(String(val))}
              options={lawOptions}
              className="[&>button]:border-cyan-500/20 [&>button]:hover:border-cyan-500/50 [&>button]:focus:border-cyan-500/50 [&>button]:focus:ring-cyan-500/20"
            />
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

          {/* Reset Button */}
          <button
            onClick={handleResetAll}
            className="px-4 py-2 rounded-lg bg-dark-800 border border-cyan-500/20 text-text-secondary hover:text-white hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Progress
          </button>
        </div>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">No questions found</p>
          <button
            onClick={() => {
              setLawFilter("all");
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
                {/* Law Number Badge */}
                {currentQuestion.lawNumber && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-cyan-400">Law {currentQuestion.lawNumber}</span>
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

