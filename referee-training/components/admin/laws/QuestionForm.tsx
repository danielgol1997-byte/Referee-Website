"use client";

import { useState } from "react";
import { QuestionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LAW_NUMBERS = Array.from({ length: 17 }, (_, idx) => idx + 1);

const LAW_OPTIONS = [
  { value: "", label: "Any law" },
  ...LAW_NUMBERS.map((num) => ({ value: num, label: `Law ${num}` })),
];

type AnswerOption = { label: string; isCorrect: boolean };

export function QuestionForm({ onCreated }: { onCreated?: () => void }) {
  const [lawNumber, setLawNumber] = useState<number | undefined>();
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [answers, setAnswers] = useState<AnswerOption[]>([
    { label: "", isCorrect: true },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          lawNumber,
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
      setLawNumber(undefined);
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
        <label className="text-sm font-medium text-white">Law number</label>
        <Select
          value={lawNumber ?? ""}
          onChange={(val) => setLawNumber(val === "" ? undefined : Number(val))}
          options={LAW_OPTIONS}
        />
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
