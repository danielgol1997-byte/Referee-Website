"use client";

import { useState, useMemo } from "react";
import { QuestionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import { useLawTags } from "@/components/hooks/useLawTags";

type AnswerOption = { label: string; isCorrect: boolean };

export function QuestionForm({ onCreated }: { onCreated?: () => void }) {
  const [lawNumbers, setLawNumbers] = useState<number[]>([]);
  const [isIfab, setIsIfab] = useState(true);
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const { lawTags } = useLawTags();
  const [answers, setAnswers] = useState<AnswerOption[]>([
    { label: "", isCorrect: true },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const lawMultiSelectOptions = useMemo(
    () => lawTags.map((tag) => ({ value: tag.number, label: tag.name })),
    [lawTags]
  );

  const updateAnswer = (idx: number, patch: Partial<AnswerOption>) => {
    setAnswers((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const setCorrect = (idx: number) => {
    setAnswers((prev) => prev.map((a, i) => ({ ...a, isCorrect: i === idx })));
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
          isIfab,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not create question");
      }
      setText("");
      setExplanation("");
      setLawNumbers([]);
      setIsIfab(true);
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
        <label className="text-sm font-medium text-white">Law Numbers</label>
        <MultiSelect
          value={lawNumbers}
          onChange={(val) => setLawNumbers(val as number[])}
          options={lawMultiSelectOptions}
          placeholder="Add law"
        />
      </div>

      <div className="space-y-3 p-4 rounded-lg border border-dark-600 bg-dark-900/50">
        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Question Source</label>
          <p className="text-xs text-text-muted">
            IFAB questions are official and appear in study mode. Custom questions are only for tests.
          </p>
        </div>
        
        {/* Source Toggle */}
        <div className="inline-flex items-center gap-4 px-4 py-2.5 rounded-full border border-dark-600 bg-dark-900">
          {/* IFAB Side */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-medium transition-colors",
              isIfab ? "text-green-400" : "text-text-muted"
            )}>
              IFAB Official
            </span>
            <button
              type="button"
              onClick={() => setIsIfab(true)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-green-500/20",
                isIfab ? "bg-green-500" : "bg-dark-700"
              )}
              role="switch"
              aria-checked={isIfab}
              aria-label="Toggle IFAB source"
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
                  isIfab ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-dark-600" />

          {/* Custom Side */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsIfab(false)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                !isIfab ? "bg-purple-500" : "bg-dark-700"
              )}
              role="switch"
              aria-checked={!isIfab}
              aria-label="Toggle custom source"
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
                  !isIfab ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
            <span className={cn(
              "text-xs font-medium transition-colors",
              !isIfab ? "text-purple-400" : "text-text-muted"
            )}>
              Custom
            </span>
          </div>
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
