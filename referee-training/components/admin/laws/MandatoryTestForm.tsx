"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompactSpinner } from "@/components/ui/compact-spinner";
import { MultiSelect } from "@/components/ui/multi-select";
import { QuestionPicker } from "./QuestionPicker";

const LAW_NUMBERS = Array.from({ length: 17 }, (_, idx) => idx + 1);

const LAW_OPTIONS = LAW_NUMBERS.map((num) => ({ 
  value: num, 
  label: `Law ${num}` 
}));

export function MandatoryTestForm({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lawNumbers, setLawNumbers] = useState<number[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [passingScore, setPassingScore] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string>("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New: Question selection mode
  const [selectionMode, setSelectionMode] = useState<"random" | "specific">("random");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  
  // Flash effect for passing score when mandatory is enabled
  const [showPassingScoreFlash, setShowPassingScoreFlash] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // For specific questions mode, fetch the questions to extract law numbers
      let extractedLawNumbers: number[] = [];
      if (selectionMode === "specific" && selectedQuestionIds.length > 0) {
        const res = await fetch(`/api/admin/questions?ids=${selectedQuestionIds.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          const uniqueLaws = new Set<number>();
          data.questions?.forEach((q: any) => {
            if (q.lawNumber) uniqueLaws.add(q.lawNumber);
          });
          extractedLawNumbers = Array.from(uniqueLaws).sort((a, b) => a - b);
        }
      }
      
      const payload = {
        title,
        description,
        categorySlug: "laws-of-the-game",
        lawNumbers: selectionMode === "random" ? lawNumbers : extractedLawNumbers,
        questionIds: selectionMode === "specific" ? selectedQuestionIds : [],
        totalQuestions: selectionMode === "specific" ? selectedQuestionIds.length : totalQuestions,
        passingScore,
        dueDate: dueDate || null,
        isActive: true, // Always active when creating
        isMandatory: isMandatory, // This determines mandatory vs pool
      };
      
      const res = await fetch("/api/admin/mandatory-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data?.error ?? "Failed to create test");
      setTitle("");
      setDescription("");
      setLawNumbers([]);
      setTotalQuestions(10);
      setPassingScore(undefined);
      setDueDate("");
      setIsMandatory(false);
      setSelectedQuestionIds([]);
      setSuccess(isMandatory ? "Mandatory test created" : "Test created and added to pool");
      onCreated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create test";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Flash effect when mandatory is enabled
  useEffect(() => {
    if (isMandatory) {
      setShowPassingScoreFlash(true);
      const timer = setTimeout(() => {
        setShowPassingScoreFlash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isMandatory]);

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Mandatory Toggle - Top of Form */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-dark-600 bg-dark-800/30">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm font-medium text-white">
              Mandatory Test
            </label>
            {isMandatory && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-accent/20 text-accent rounded-full border border-accent/30">
                REQUIRED
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            {isMandatory 
              ? "Will be assigned to all users and appear in their training dashboard" 
              : "Non mandatory tests will be added to the public tests pool for all users to access"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsMandatory(!isMandatory)}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-900 ${
            isMandatory ? "bg-accent shadow-lg shadow-accent/20" : "bg-dark-600"
          }`}
          aria-label={isMandatory ? "Switch to pool test" : "Make mandatory"}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
              isMandatory ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        {isMandatory && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-white">
              Due date
            </label>
            <Input 
              type="date" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)}
              min={today}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-white">Description</label>
        <textarea
          className="w-full rounded-lg border border-dark-600 bg-dark-900 text-white px-4 py-2.5 text-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description for this test..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-white">Question Selection</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="selectionMode"
              value="random"
              checked={selectionMode === "random"}
              onChange={() => setSelectionMode("random")}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 bg-dark-900 transition-all flex items-center justify-center ${
              selectionMode === "random" ? "border-accent" : "border-dark-600"
            }`}>
              {selectionMode === "random" && (
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
              )}
            </div>
            <span className="text-sm text-white group-hover:text-accent transition-colors">Random from selected laws</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="selectionMode"
              value="specific"
              checked={selectionMode === "specific"}
              onChange={() => setSelectionMode("specific")}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 bg-dark-900 transition-all flex items-center justify-center ${
              selectionMode === "specific" ? "border-accent" : "border-dark-600"
            }`}>
              {selectionMode === "specific" && (
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
              )}
            </div>
            <span className="text-sm text-white group-hover:text-accent transition-colors">Choose specific questions</span>
          </label>
        </div>
      </div>

      {selectionMode === "random" ? (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-white">Select laws</label>
            <p className="text-xs text-text-secondary mb-2">Questions will be randomly selected from these laws</p>
            <MultiSelect
              value={lawNumbers}
              onChange={setLawNumbers}
              options={LAW_OPTIONS}
              placeholder="Add Law"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white">Questions</label>
              <CompactSpinner
                value={totalQuestions}
                onChange={setTotalQuestions}
                min={1}
                max={1000}
              />
            </div>
            {isMandatory && (
              <div 
                className={`space-y-1 rounded-lg p-3 -m-3 transition-all duration-1000 ${
                  showPassingScoreFlash 
                    ? 'border-2 border-yellow-400 shadow-lg shadow-yellow-400/20' 
                    : 'border-2 border-transparent'
                }`}
              >
                <label className="text-sm font-medium text-white">Passing score</label>
                <CompactSpinner
                  value={passingScore ?? 0}
                  onChange={(val) => setPassingScore(val > 0 ? val : undefined)}
                  min={0}
                  max={1000}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-white">Select specific questions</label>
            <p className="text-xs text-text-secondary mb-2">Choose the exact questions for this test</p>
            <QuestionPicker
              selectedQuestionIds={selectedQuestionIds}
              onQuestionsChange={setSelectedQuestionIds}
            />
          </div>

          {isMandatory && (
            <div 
              className={`space-y-1 rounded-lg p-3 -m-3 transition-all duration-1000 ${
                showPassingScoreFlash 
                  ? 'border-2 border-yellow-400 shadow-lg shadow-yellow-400/20' 
                  : 'border-2 border-transparent'
              }`}
            >
              <label className="text-sm font-medium text-white">Passing score</label>
              <CompactSpinner
                value={passingScore ?? 0}
                onChange={(val) => setPassingScore(val > 0 ? val : undefined)}
                min={0}
                max={1000}
              />
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={
            loading || 
            !title || 
            (selectionMode === "random" && lawNumbers.length === 0) ||
            (selectionMode === "specific" && selectedQuestionIds.length === 0)
          }
        >
          {loading ? "Saving..." : "Create Test"}
        </Button>
        {error ? <p className="text-sm text-status-danger">{error}</p> : null}
        {success ? <p className="text-sm text-accent">{success}</p> : null}
      </div>
    </form>
  );
}
