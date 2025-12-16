"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/ui/video-player";

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
  videoClip?: {
    fileUrl: string;
    thumbnailUrl?: string | null;
    title: string;
  } | null;
  answerOptions: AnswerOption[];
};

type AnswerState = {
  selectedOptionId?: string;
};

export function TestRunner({ sessionId, resultsHref }: { sessionId: string; resultsHref: string }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [tempPosition, setTempPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tests/${sessionId}/questions`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Failed to load questions");
          setLoading(false);
          return;
        }
        setQuestions(data.questions ?? []);
      } catch {
        setError("Failed to load questions");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [sessionId]);

  const currentQuestion = questions[current];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isFirst = current === 0;
  const isLast = current === questions.length - 1;
  const answeredCount = Object.keys(answers).filter(k => answers[k].selectedOptionId).length;
  const allAnswered = answeredCount === questions.length;

  const handleSelectAnswer = (optionId: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        selectedOptionId: optionId,
      },
    }));
  };

  const goNext = () => {
    if (!isLast) {
      setCurrent((idx) => idx + 1);
    }
  };

  const goPrevious = () => {
    if (!isFirst) {
      setCurrent((idx) => idx - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrent(index);
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
      
      // Calculate fractional position for smooth rotation
      // Each 80px of drag = 1 question movement
      const fractionalOffset = -delta / 80;
      const newPosition = current + fractionalOffset;
      
      // Clamp to valid range
      const clampedPosition = Math.max(0, Math.min(questions.length - 1, newPosition));
      setTempPosition(clampedPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Snap to nearest question
      const snappedIndex = Math.round(tempPosition);
      const finalIndex = Math.max(0, Math.min(questions.length - 1, snappedIndex));
      
      setCurrent(finalIndex);
      setDragOffset(0);
      setTempPosition(finalIndex);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, current, questions.length, tempPosition]);

  const findFirstIncompleteQuestion = () => {
    // Find the smallest index of unanswered questions
    for (let i = 0; i < questions.length; i++) {
      if (!answers[questions[i].id]?.selectedOptionId) {
        return i;
      }
    }
    return -1;
  };

  const handleSubmitClick = () => {
    // Check if all questions are answered
    const firstIncomplete = findFirstIncompleteQuestion();
    if (firstIncomplete !== -1) {
      // Smoothly shift carousel to first incomplete question (smallest index)
      setCurrent(firstIncomplete);
      // Scroll the question card into view smoothly
      setTimeout(() => {
        const questionCard = document.querySelector('[data-question-card]');
        if (questionCard) {
          questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return;
    }

    // Show confirmation
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Submit all answers
      for (const questionId in answers) {
        const answer = answers[questionId];
        if (answer.selectedOptionId) {
          await fetch(`/api/tests/${sessionId}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId,
              selectedOptionId: answer.selectedOptionId,
            }),
          });
        }
      }
      // Navigate to results
      router.push(resultsHref);
    } catch {
      setError("Could not submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmation(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-status-dangerBg border border-status-danger/30">
        <p className="text-sm text-status-danger">{error}</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No questions available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Question {current + 1} <span className="text-text-secondary">/ {questions.length}</span>
          </h2>
          <div className="text-sm text-text-secondary">
            {answeredCount} of {questions.length} answered
          </div>
        </div>
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-accent to-cyan-400 transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden" data-question-card>
        {currentQuestion.videoClip && (
          <div className="border-b border-dark-600">
            <VideoPlayer 
              source={currentQuestion.videoClip.fileUrl} 
              poster={currentQuestion.videoClip.thumbnailUrl ?? undefined} 
            />
          </div>
        )}
        
        <div className="p-8 space-y-6">
          {/* Question Text */}
          <h3 className="text-xl font-semibold text-white leading-relaxed">
            {currentQuestion.text}
          </h3>

          {/* Answer Options */}
          <div className="grid gap-3">
            {currentQuestion.answerOptions.map((option, idx) => {
              const isSelected = currentAnswer?.selectedOptionId === option.id;
              
              return (
                <button
                  key={option.id}
                  className={`
                    relative group text-left p-6 rounded-xl border-2 transition-all duration-300 overflow-hidden
                    ${isSelected 
                      ? 'border-accent bg-gradient-to-r from-accent/10 via-accent/5 to-transparent shadow-xl shadow-accent/20 scale-[1.02]' 
                      : 'border-dark-600 bg-dark-800/50 hover:border-accent/50 hover:bg-dark-700/50 hover:scale-[1.01]'
                    }
                  `}
                  style={{
                    animationName: 'slideInFromLeft',
                    animationDuration: '0.4s',
                    animationTimingFunction: 'ease-out',
                    animationDelay: `${idx * 50}ms`,
                    animationFillMode: 'both',
                  }}
                  onClick={() => handleSelectAnswer(option.id)}
                >
                  {/* Shimmer effect on hover */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent -translate-x-full
                    group-hover:translate-x-full transition-transform duration-700
                    ${isSelected ? 'opacity-0' : ''}
                  `} />
                  
                  {/* Checkmark for selected */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/40 animate-in zoom-in duration-200">
                      <svg className="w-5 h-5 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 relative">
                    {/* Letter Badge */}
                    <div className={`
                      flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold transition-all
                      ${isSelected 
                        ? 'bg-accent text-dark-900 shadow-lg shadow-accent/30' 
                        : 'bg-dark-700 text-text-secondary border border-dark-600 group-hover:border-accent/30 group-hover:text-accent'
                      }
                    `}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    
                    {/* Option Label */}
                    <span className={`
                      text-base font-medium transition-colors flex-1 leading-relaxed
                      ${isSelected ? 'text-white pr-10' : 'text-text-secondary group-hover:text-white'}
                    `}>
                      {option.label}
                    </span>
                  </div>

                  {/* Bottom accent line for selected */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question Navigation Carousel - Fixed Height */}
      <div className="relative" style={{ height: '100px' }}>
        <div 
          ref={carouselRef}
          className={`relative flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          style={{ 
            perspective: '1000px',
            height: '100px',
            userSelect: 'none',
          }}
        >
          {/* Carousel Container */}
          <div className="relative w-full max-w-md mx-auto" style={{ height: '80px' }}>
            {questions.map((_, index) => {
              // Use tempPosition during drag for smooth rotation, otherwise use current
              const basePosition = isDragging ? tempPosition : current;
              const offset = index - basePosition;
              
              // Only show nearby questions
              if (Math.abs(offset) > 4) return null;
              
              // Transform values based on offset from the rotating position
              let translateX = offset * 80;
              let translateZ = -Math.abs(offset) * 50;
              let scale = 1 - Math.abs(offset) * 0.15;
              let opacity = Math.max(0.2, 1 - Math.abs(offset) * 0.25);
              let zIndex = 30 - Math.abs(offset) * 5;
              
              const isAnswered = !!answers[questions[index].id]?.selectedOptionId;
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
                    ${isCurrent || isNearlyCurrent
                      ? 'bg-gradient-to-br from-accent to-cyan-400 text-dark-900 shadow-2xl shadow-accent/40' 
                      : isAnswered
                        ? 'bg-dark-700 text-white border-2 border-accent/50 hover:border-accent hover:scale-110 shadow-lg shadow-accent/20 cursor-pointer'
                        : 'bg-dark-800 text-text-secondary border-2 border-dark-600 hover:border-accent/30 hover:scale-110 cursor-pointer'
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
                    transformStyle: 'preserve-3d',
                    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
                >
                  {/* Yellow checkmark for answered questions */}
                  {isAnswered && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-dark-900 flex items-center justify-center shadow-lg">
                      <svg className="w-3 h-3 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-dark-900/90 border border-dark-600 text-white hover:bg-dark-800 hover:border-accent/30 hover:scale-110 transition-all shadow-lg backdrop-blur-sm disabled:opacity-30 disabled:hover:scale-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Show Next button if not on last question AND not all answered yet */}
          {!isLast && !allAnswered && (
            <button
              onClick={goNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-dark-900/90 border border-dark-600 text-white hover:bg-dark-800 hover:border-accent/30 hover:scale-110 transition-all shadow-lg backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Show Submit button if all questions are answered */}
          {allAnswered && !showConfirmation && (
            <div
              onClick={handleSubmitClick}
              className={`
                absolute right-0 top-1/2 -translate-y-1/2 z-40
                flex items-center gap-2 px-4 py-2 rounded-lg
                bg-gradient-to-r from-accent via-cyan-400 to-accent
                hover:opacity-90 shadow-lg shadow-accent/30
                transition-all cursor-pointer
                ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-dark-900 font-medium">Submitting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-dark-900 font-medium">Submit Test</span>
                </>
              )}
            </div>
          )}

          {/* Show Confirmation buttons if confirmation is active */}
          {showConfirmation && (
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200"
            >
              <button
                onClick={handleCancelSubmit}
                className="px-4 py-2 rounded-lg bg-dark-700 text-white font-medium border-2 border-dark-600 hover:border-accent/50 hover:bg-dark-600 transition-all shadow-lg"
              >
                Not yet
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className={`
                  px-4 py-2 rounded-lg
                  bg-gradient-to-r from-accent via-cyan-400 to-accent
                  text-dark-900 font-medium
                  hover:opacity-90 shadow-lg shadow-accent/30
                  transition-all
                  ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Yes, submit'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
