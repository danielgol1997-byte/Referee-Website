"use client";

import { useState, useRef, useEffect } from "react";
import { QuestionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLawTags } from "@/components/hooks/useLawTags";

type AnswerOption = { label: string; isCorrect: boolean };

export function QuestionForm({ onCreated }: { onCreated?: () => void }) {
  const [lawNumbers, setLawNumbers] = useState<number[]>([]);
  const [isLawDropdownOpen, setIsLawDropdownOpen] = useState(false);
  const lawDropdownRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const { lawTags, getLawLabel, isLoading: isLoadingLawTags } = useLawTags();
  const [answers, setAnswers] = useState<AnswerOption[]>([
    { label: "", isCorrect: true },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lawDropdownRef.current && !lawDropdownRef.current.contains(event.target as Node)) {
        setIsLawDropdownOpen(false);
      }
    };

    if (isLawDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLawDropdownOpen]);

  const updateAnswer = (idx: number, patch: Partial<AnswerOption>) => {
    setAnswers((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const setCorrect = (idx: number) => {
    setAnswers((prev) => prev.map((a, i) => ({ ...a, isCorrect: i === idx })));
  };

  const toggleLaw = (lawNumber: number) => {
    setLawNumbers((prev) => {
      if (prev.includes(lawNumber)) {
        return prev.filter((num) => num !== lawNumber);
      } else {
        return [...prev, lawNumber].sort((a, b) => a - b);
      }
    });
  };

  const clearAllLaws = () => {
    setLawNumbers([]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: QuestionType.LOTG_TEXT,
          categorySlug: "laws-of-the-game",
          lawNumbers,
          text,
          explanation,
          difficulty: 1,
          answerOptions: answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not create question");
      }
      setText("");
      setExplanation("");
      setLawNumbers([]);
      setAnswers([
        { label: "", isCorrect: true },
        { label: "", isCorrect: false },
        { label: "", isCorrect: false },
        { label: "", isCorrect: false },
      ]);
      setSuccess("Question created");
      onCreated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create question";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-white">Law tags (select multiple)</label>
        <div className="relative" ref={lawDropdownRef}>
          <button
            type="button"
            onClick={() => setIsLawDropdownOpen(!isLawDropdownOpen)}
            className="w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-left bg-dark-900 border border-dark-600 text-white hover:border-accent/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
          >
            <span className={lawNumbers.length === 0 ? "text-text-muted" : ""}>
              {lawNumbers.length === 0 
                ? isLoadingLawTags ? "Loading laws..." : "No laws selected"
                : lawNumbers.length === 1
                ? getLawLabel(lawNumbers[0])
                : `${lawNumbers.length} laws selected`
              }
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
            <div className="absolute top-full mt-2 z-50 w-full rounded-lg border border-dark-600 bg-dark-800 shadow-elevated max-h-60 overflow-auto">
              <div className="p-1">
                {lawNumbers.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={clearAllLaws}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors text-left text-text-secondary hover:text-white hover:bg-dark-700 border-b border-dark-600 mb-1"
                    >
                      <span>Clear all</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
                
                {lawTags.length > 0 ? (
                  lawTags.map((tag) => {
                    const isSelected = lawNumbers.includes(tag.number);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleLaw(tag.number)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                          isSelected 
                            ? "bg-accent/10 text-accent hover:bg-accent/20" 
                            : "text-text-secondary hover:text-white hover:bg-dark-700"
                        )}
                      >
                        <span>{tag.name}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-sm text-text-muted">
                    {isLoadingLawTags ? "Loading law tags..." : "No law tags available"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-white">Question text</label>
        <textarea
          className="w-full rounded-lg border border-dark-600 bg-dark-900 text-white px-4 py-2.5 text-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          required
          placeholder="Enter the question text..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-white">Explanation</label>
        <textarea
          className="w-full rounded-lg border border-dark-600 bg-dark-900 text-white px-4 py-2.5 text-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          required
          placeholder="Provide an explanation for the correct answer..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Answer options</label>
        <div className="space-y-2">
          {answers.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCorrect(idx)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 bg-dark-900 transition-all flex items-center justify-center flex-shrink-0",
                  opt.isCorrect ? "border-accent" : "border-dark-600 hover:border-dark-500"
                )}
                aria-label={`Mark option ${idx + 1} as correct`}
              >
                {opt.isCorrect && (
                  <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                )}
              </button>
              <Input
                value={opt.label}
                onChange={(e) => updateAnswer(idx, { label: e.target.value })}
                placeholder={`Option ${idx + 1}`}
                required
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Question"}
        </Button>
        {success ? <span className="text-sm text-accent">{success}</span> : null}
        {error ? <span className="text-sm text-status-danger">{error}</span> : null}
      </div>
    </form>
  );
}
