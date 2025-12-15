"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SummaryResponse = {
  session: {
    id: string;
    score: number | null;
    totalQuestions: number;
    testAnswers: Array<{
      id: string;
      isCorrect: boolean;
      selectedOption?: { label: string } | null;
      question: {
        id: string;
        text: string;
        explanation: string;
        answerOptions: Array<{ id: string; label: string; isCorrect: boolean }>;
      };
    }>;
  };
  correctCount: number;
  total: number;
};

export function TestSummary({
  sessionId,
  restartHref = "/laws/test",
}: {
  sessionId: string;
  restartHref?: string;
}) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/tests/${sessionId}/summary`);
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error ?? "Failed to load summary");
          return;
        }
        setData(json);
      } catch {
        setError("Failed to load summary");
      }
    };
    load();
  }, [sessionId]);

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-status-dangerBg border border-status-danger/30">
        <p className="text-sm text-status-danger">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const score = data.session.score ?? data.correctCount;
  const percentage = Math.round((score / data.session.totalQuestions) * 100);
  const passed = percentage >= 70;

  return (
    <div className="space-y-8">
      {/* Results Header Card */}
      <div className="relative rounded-xl border border-dark-600 bg-gradient-to-br from-dark-700 to-dark-800 overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
        
        <div className="relative p-8 md:p-12 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-900/50 border border-dark-600">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Test Complete
            </span>
          </div>

          {/* Score Display */}
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              {score} <span className="text-text-secondary">/ {data.session.totalQuestions}</span>
            </h1>
            <p className="text-xl text-text-secondary">
              {percentage}% Correct
            </p>
          </div>

          {/* Pass/Fail Indicator */}
          {passed ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-status-success/20 border border-status-success/30">
              <svg className="w-5 h-5 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-status-success">Great work!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-semibold text-amber-400">Keep practicing!</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4">
            <Button 
              asChild 
              size="lg"
              className="gap-2 bg-gradient-to-r from-accent via-cyan-400 to-accent hover:opacity-90"
            >
              <Link href={restartHref}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Tests
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-dark-600" />
        <h2 className="text-lg font-semibold text-white uppercase tracking-wider">Question Review</h2>
        <div className="flex-1 h-px bg-dark-600" />
      </div>

      {/* Question Review */}
      <div className="space-y-4">
        {data.session.testAnswers.map((answer, index) => {
          const correctOption = answer.question.answerOptions.find((opt) => opt.isCorrect);
          const userOption = answer.selectedOption;
          
          return (
            <div 
              key={answer.id} 
              className="rounded-xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden"
            >
              {/* Question Header */}
              <div className={`
                px-6 py-4 border-b flex items-center justify-between
                ${answer.isCorrect 
                  ? 'bg-status-success/10 border-status-success/30' 
                  : 'bg-status-danger/10 border-status-danger/30'
                }
              `}>
                <div className="flex items-center gap-3">
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${answer.isCorrect 
                      ? 'bg-status-success/20 text-status-success' 
                      : 'bg-status-danger/20 text-status-danger'
                    }
                  `}>
                    {answer.isCorrect ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white">
                    Question {index + 1}
                  </span>
                </div>
                <span className={`
                  text-xs font-bold uppercase tracking-wider
                  ${answer.isCorrect ? 'text-status-success' : 'text-status-danger'}
                `}>
                  {answer.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              {/* Question Content */}
              <div className="p-6 space-y-5">
                {/* Question Text */}
                <p className="text-base font-medium text-white leading-relaxed">
                  {answer.question.text}
                </p>

                {/* Answers Comparison */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Your Answer */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Your Answer
                    </p>
                    <div className={`
                      p-4 rounded-lg border-2
                      ${answer.isCorrect 
                        ? 'border-status-success bg-status-success/10' 
                        : 'border-status-danger bg-status-danger/10'
                      }
                    `}>
                      <p className={`
                        text-sm font-medium
                        ${answer.isCorrect ? 'text-status-success' : 'text-status-danger'}
                      `}>
                        {userOption?.label || "Not answered"}
                      </p>
                    </div>
                  </div>

                  {/* Correct Answer */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Correct Answer
                    </p>
                    <div className="p-4 rounded-lg border-2 border-status-success bg-status-success/10">
                      <p className="text-sm font-medium text-status-success">
                        {correctOption?.label || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                {answer.question.explanation && (
                  <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-600">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-1">
                          Explanation
                        </p>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {answer.question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action */}
      <div className="text-center pt-4">
        <Button 
          asChild 
          size="lg"
          variant="outline"
          className="gap-2"
        >
          <Link href={restartHref}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Tests
          </Link>
        </Button>
      </div>
    </div>
  );
}
