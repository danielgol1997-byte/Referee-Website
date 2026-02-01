"use client";

// Updated column widths for better layout
import { useEffect, useState, useRef, useMemo } from "react";
import React from "react";
import { Question } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import { useLawTags } from "@/components/hooks/useLawTags";
import { useModal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DualSourceToggle } from "@/components/ui/dual-source-toggle";

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hard" },
];

type AnswerOption = {
  id: string;
  label: string;
  isCorrect: boolean;
  code?: string;
  order?: number;
};

type QuestionWithRelations = Question & {
  answerOptions: AnswerOption[];
  category?: { id: string; name: string; slug: string };
  isActive?: boolean;
};

type EditFormAnswer = {
  label: string;
  isCorrect: boolean;
};

type EditForm = {
  lawNumbers: number[];
  isIfab: boolean;
  text: string;
  explanation: string;
  difficulty: number;
  answers: EditFormAnswer[];
};

const VAR_FILTER_OPTIONS = [
  { value: "exclude", label: "Exclude" },
  { value: "include", label: "Include" },
  { value: "only", label: "VAR Only" },
];

const UP_TO_DATE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "upToDate", label: "Current" },
  { value: "outdated", label: "Outdated" },
];

const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Visible" },
  { value: "inactive", label: "Invisible" },
];

export function QuestionList({ refreshKey = 0 }: { refreshKey?: number }) {
  const modal = useModal();
  const [selectedLawTags, setSelectedLawTags] = useState<number[]>([]);
  const [lawSortOrder, setLawSortOrder] = useState<"asc" | "desc" | null>(null);
  const [varFilter, setVarFilter] = useState<string>("exclude");
  const [upToDateFilter, setUpToDateFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [includeIfabFilter, setIncludeIfabFilter] = useState(true);
  const [includeCustomFilter, setIncludeCustomFilter] = useState(true);
  const [questions, setQuestions] = useState<QuestionWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingQuestionId, setViewingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    lawNumbers: [],
    isIfab: true,
    text: "",
    explanation: "",
    difficulty: 2,
    answers: [
      { label: "", isCorrect: true },
      { label: "", isCorrect: false },
      { label: "", isCorrect: false },
      { label: "", isCorrect: false },
    ],
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const { lawTags, getLawLabel, isLoading: isLoadingLawTags } = useLawTags();

  const PER_PAGE_OPTIONS = [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 50, label: "50" },
  ];

  const lawMultiSelectOptions = useMemo(
    () => lawTags.map((tag) => ({ value: tag.number, label: tag.name })),
    [lawTags]
  );

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("type", "LOTG_TEXT");
      
      // Handle multiple law filters
      selectedLawTags.forEach(lawNum => {
        params.append("lawNumber", String(lawNum));
      });
      
      if (varFilter === "include") params.set("includeVar", "true");
      if (varFilter === "only") params.set("onlyVar", "true");
      
      if (upToDateFilter === "upToDate") params.set("upToDate", "true");
      if (upToDateFilter === "outdated") params.set("outdated", "true");
      
      if (activeFilter === "active") params.set("isActive", "true");
      if (activeFilter === "inactive") params.set("isActive", "false");
      
      // Apply source filtering
      if (includeIfabFilter && !includeCustomFilter) {
        params.set("isIfab", "true");
      } else if (!includeIfabFilter && includeCustomFilter) {
        params.set("isIfab", "false");
      }
      // If both or neither, don't add filter (show all)
      
      params.set("categorySlug", "laws-of-the-game");
      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load questions");
      setQuestions(data.questions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load questions";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update question");
      await fetchQuestions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle active";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUpToDate = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUpToDate: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update question");
      await fetchQuestions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update question";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteQuestion = async (id: string) => {
    const confirmed = await modal.showConfirm(
      "Are you sure you want to delete this question? This action cannot be undone.",
      "Delete Question",
      "warning"
    );
    
    if (!confirmed) return;
    
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete question");
      await fetchQuestions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete question";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (question: QuestionWithRelations) => {
    setEditingId(question.id);
    setEditForm({
      lawNumbers: (question as any).lawNumbers || [],
      isIfab: (question as any).isIfab ?? true,
      text: question.text,
      explanation: question.explanation,
      difficulty: question.difficulty || 2,
      answers: question.answerOptions.map((opt) => ({
        label: opt.label,
        isCorrect: opt.isCorrect,
      })),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      lawNumbers: [],
      isIfab: true,
      text: "",
      explanation: "",
      difficulty: 2,
      answers: [
        { label: "", isCorrect: true },
        { label: "", isCorrect: false },
        { label: "", isCorrect: false },
        { label: "", isCorrect: false },
      ],
    });
  };

  const saveEdit = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawNumbers: editForm.lawNumbers,
          isIfab: editForm.isIfab,
          text: editForm.text,
          explanation: editForm.explanation,
          difficulty: editForm.difficulty,
          answerOptions: editForm.answers.map((a, idx) => ({
            label: a.label,
            code: `OPT_${idx}`,
            isCorrect: a.isCorrect,
            order: idx,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to update question");
      await fetchQuestions();
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update question";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const updateAnswer = (index: number, field: keyof EditFormAnswer, value: string | boolean) => {
    const newAnswers = [...editForm.answers];
    if (field === "isCorrect" && value === true) {
      // Only one correct answer allowed
      newAnswers.forEach((a, i) => {
        a.isCorrect = i === index;
      });
    } else {
      newAnswers[index] = { ...newAnswers[index], [field]: value };
    }
    setEditForm({ ...editForm, answers: newAnswers });
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // Clicked outside modal - close it
        setViewingQuestionId(null);
      }
    };

    if (viewingQuestionId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [viewingQuestionId]);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, selectedLawTags, varFilter, upToDateFilter, activeFilter, includeIfabFilter, includeCustomFilter]);

  const filtered = search
    ? questions.filter((q) => q.text.toLowerCase().includes(search.toLowerCase()))
    : questions;

  // Sort by law numbers if sort order is set
  const sortedQuestions = lawSortOrder ? [...filtered].sort((a, b) => {
    const aLaws = (a as any).lawNumbers || [];
    const bLaws = (b as any).lawNumbers || [];
    
    // Get the first (lowest) law number for each question, or use 999 if no laws
    const aFirstLaw = aLaws.length > 0 ? Math.min(...aLaws) : 999;
    const bFirstLaw = bLaws.length > 0 ? Math.min(...bLaws) : 999;
    
    if (lawSortOrder === "asc") {
      return aFirstLaw - bFirstLaw;
    } else {
      return bFirstLaw - aFirstLaw;
    }
  }) : filtered;

  const totalPages = Math.ceil(sortedQuestions.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedQuestions = sortedQuestions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedLawTags, varFilter, upToDateFilter, activeFilter, includeIfabFilter, includeCustomFilter, perPage, lawSortOrder]);

  const resetFilters = () => {
    setSelectedLawTags([]);
    setVarFilter("exclude");
    setUpToDateFilter("all");
    setActiveFilter("all");
    setIncludeIfabFilter(true);
    setIncludeCustomFilter(true);
    setSearch("");
    setLawSortOrder(null);
  };

  const hasActiveFilters = 
    selectedLawTags.length > 0 ||
    varFilter !== "exclude" ||
    upToDateFilter !== "all" ||
    activeFilter !== "all" ||
    !includeIfabFilter ||
    !includeCustomFilter ||
    search !== "";

  const isEditFormValid = () => {
    return (
      editForm.text.trim() !== "" &&
      editForm.explanation.trim() !== "" &&
      editForm.answers.every((a) => a.label.trim() !== "") &&
      editForm.answers.some((a) => a.isCorrect)
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/20 bg-dark-800/50 p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question text..."
                className="w-full"
              />
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Law Tags Filter */}
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Laws
              </label>
              <MultiSelect
                value={selectedLawTags}
                onChange={(val) => {
                  setSelectedLawTags(val as number[]);
                  setLawSortOrder(null);
                }}
                options={lawMultiSelectOptions}
                placeholder="Select laws..."
              />
            </div>

            {/* VAR Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                VAR Questions
              </label>
              <SegmentedControl
                value={varFilter}
                onChange={setVarFilter}
                options={VAR_FILTER_OPTIONS}
              />
            </div>

            {/* Up to Date Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Up to Date
              </label>
              <SegmentedControl
                value={upToDateFilter}
                onChange={setUpToDateFilter}
                options={UP_TO_DATE_FILTER_OPTIONS}
              />
            </div>

            {/* Active Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Active Status
              </label>
              <SegmentedControl
                value={activeFilter}
                onChange={setActiveFilter}
                options={ACTIVE_FILTER_OPTIONS}
              />
            </div>

            {/* Source Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Sources
              </label>
              <DualSourceToggle
                includeIfab={includeIfabFilter}
                includeCustom={includeCustomFilter}
                onIfabChange={setIncludeIfabFilter}
                onCustomChange={setIncludeCustomFilter}
              />
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-transparent uppercase tracking-wider">
                  &nbsp;
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="whitespace-nowrap"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
          
          {/* Results info and per-page selector */}
          <div className="flex items-center justify-between text-sm text-text-secondary border-t border-dark-600 pt-3">
            <span>
              {sortedQuestions.length > 0 ? (
                <>Showing {startIndex + 1}-{Math.min(endIndex, sortedQuestions.length)} of {sortedQuestions.length}</>
              ) : (
                <>No questions found</>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <Select
                value={perPage}
                onChange={(val) => setPerPage(Number(val))}
                options={PER_PAGE_OPTIONS}
                className="w-20"
              />
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading questions…</p>}
      {error && <p className="text-sm text-status-danger">{error}</p>}

      {!loading && sortedQuestions.length === 0 ? (
        <p className="text-sm text-text-secondary">No questions found.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-dark-600">
            <table className="min-w-full divide-y divide-dark-600">
              <thead className="bg-dark-800/50">
                <tr>
                  <th 
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors",
                      lawSortOrder 
                        ? "text-accent" 
                        : "text-accent/80 hover:text-accent"
                    )}
                    style={{ width: '100px', maxWidth: '100px' }}
                    onClick={() => {
                      if (lawSortOrder === null || lawSortOrder === "desc") {
                        // First click (or after descending): Sort ascending (low to high)
                        setLawSortOrder("asc");
                      } else {
                        // Second click: Sort descending (high to low)
                        setLawSortOrder("desc");
                      }
                    }}
                    title={lawSortOrder === "asc" ? "Click to sort descending (high to low)" : "Click to sort ascending (low to high)"}
                  >
                    Law {lawSortOrder === "asc" ? "↑" : lawSortOrder === "desc" ? "↓" : ""}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80">
                    Question
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80" style={{ width: '300px' }}>
                    Answers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80" style={{ width: '100px' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-accent/80" style={{ width: '90px' }}>
                    Current
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-accent/80" style={{ width: '130px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600 bg-dark-900/50">
                {paginatedQuestions.map((q) => {
                  const isEditing = editingId === q.id;
                  const isActive = q.isActive !== false; // Default to true if undefined

                  if (isEditing) {
                    return (
                      <tr key={q.id} className="bg-dark-800/50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-white">Law Numbers</label>
                              <MultiSelect
                                value={editForm.lawNumbers}
                                onChange={(val) => setEditForm({ ...editForm, lawNumbers: val as number[] })}
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
                              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full border border-dark-600 bg-dark-900">
                                <span className={cn(
                                  "text-xs font-medium transition-colors",
                                  !editForm.isIfab ? "text-purple-400" : "text-text-muted"
                                )}>
                                  Custom
                                </span>
                                
                                <button
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, isIfab: !editForm.isIfab })}
                                  className={cn(
                                    "relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200",
                                    "focus:outline-none focus:ring-2",
                                    editForm.isIfab 
                                      ? "bg-green-500 focus:ring-green-500/20" 
                                      : "bg-purple-500 focus:ring-purple-500/20"
                                  )}
                                  role="switch"
                                  aria-checked={editForm.isIfab}
                                  aria-label="Toggle question source"
                                >
                                  <span
                                    className={cn(
                                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
                                      editForm.isIfab ? "translate-x-5" : "translate-x-0.5"
                                    )}
                                  />
                                </button>
                                
                                <span className={cn(
                                  "text-xs font-medium transition-colors",
                                  editForm.isIfab ? "text-green-400" : "text-text-muted"
                                )}>
                                  IFAB Official
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-white">Question Text</label>
                              <textarea
                                className="w-full rounded-lg border border-dark-600 bg-dark-900 text-white px-4 py-2.5 text-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                                rows={3}
                                value={editForm.text}
                                onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                                placeholder="Enter the question..."
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-white">Explanation</label>
                              <textarea
                                className="w-full rounded-lg border border-dark-600 bg-dark-900 text-white px-4 py-2.5 text-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                                rows={2}
                                value={editForm.explanation}
                                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                                placeholder="Explain the correct answer..."
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white">Answer Options</label>
                              <p className="text-xs text-text-secondary">Select the radio button next to the correct answer</p>
                              <div className="space-y-2">
                                {editForm.answers.map((answer, idx) => (
                                  <div key={idx} className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => updateAnswer(idx, "isCorrect", true)}
                                      className={cn(
                                        "w-5 h-5 rounded-full border-2 bg-dark-900 transition-all flex items-center justify-center flex-shrink-0",
                                        answer.isCorrect ? "border-accent" : "border-dark-600 hover:border-dark-500"
                                      )}
                                    >
                                      {answer.isCorrect && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                                      )}
                                    </button>
                                    <Input
                                      value={answer.label}
                                      onChange={(e) => updateAnswer(idx, "label", e.target.value)}
                                      placeholder={`Answer ${idx + 1}`}
                                      className="flex-1"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                onClick={() => saveEdit(q.id)}
                                disabled={actionLoading === q.id || !isEditFormValid()}
                              >
                                {actionLoading === q.id ? "Saving..." : "Save Changes"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={actionLoading === q.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={q.id} 
                      className={cn(
                        "hover:bg-dark-800/30 transition-colors cursor-pointer",
                        !isActive && "opacity-50",
                        viewingQuestionId === q.id && "bg-dark-800/50"
                      )}
                      onClick={(e) => {
                        // Don't trigger if clicking on action buttons
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('svg')) {
                          return;
                        }
                        setViewingQuestionId(viewingQuestionId === q.id ? null : q.id);
                      }}
                    >
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: '100px', maxWidth: '100px' }}>
                        <div className="overflow-hidden text-ellipsis">
                          {(q as any).lawNumbers?.length > 0 
                            ? (q as any).lawNumbers.map((num: number) => getLawLabel(num)).join(", ")
                            : "—"
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        <div className="line-clamp-3">{q.text}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white" style={{ width: '300px' }}>
                        <div className="flex flex-wrap gap-1.5">
                          {q.answerOptions.map((opt) => (
                            <span
                              key={opt.id}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-xs leading-tight inline-flex items-center",
                                opt.isCorrect 
                                  ? "bg-accent/20 text-accent border border-accent/30" 
                                  : "bg-dark-700 text-text-secondary border border-transparent"
                              )}
                            >
                              {opt.label.length > 30 ? opt.label.substring(0, 30) + "..." : opt.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ width: '100px' }}>
                        {isActive ? (
                          <span className="rounded-full bg-accent/20 border border-accent/30 px-2 py-1 text-xs text-accent">Visible</span>
                        ) : (
                          <span className="rounded-full bg-dark-700 px-2 py-1 text-xs text-text-secondary">Invisible</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ width: '90px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleUpToDate(q.id, (q as any).isUpToDate || false)}
                          disabled={actionLoading === q.id}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 disabled:opacity-50",
                            (q as any).isUpToDate 
                              ? "bg-status-success shadow-sm shadow-status-success/20" 
                              : "bg-status-danger shadow-sm shadow-status-danger/20"
                          )}
                          title={(q as any).isUpToDate ? "Up to date" : "Outdated"}
                        >
                          <span
                            className={cn(
                              "inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                              (q as any).isUpToDate ? "translate-x-5" : "translate-x-1"
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-white" style={{ width: '130px' }}>
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => startEdit(q)}
                            disabled={actionLoading === q.id}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-dark-700 transition-colors disabled:opacity-50"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleActive(q.id, isActive)}
                            disabled={actionLoading === q.id}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-dark-700 transition-colors disabled:opacity-50"
                            title={isActive ? "Make Invisible" : "Make Visible"}
                          >
                            {isActive ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            disabled={actionLoading === q.id}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-status-danger hover:bg-status-dangerBg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                          page === currentPage
                            ? "bg-accent text-dark-900"
                            : "bg-dark-800 text-text-secondary hover:bg-dark-700 hover:text-white"
                        )}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-text-muted">...</span>;
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          )}
        </>
      )}

      <Button variant="outline" size="sm" onClick={fetchQuestions}>
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </Button>

      {/* Question View Modal - Temporary Popup */}
      {viewingQuestionId && (() => {
        const viewingQuestion = questions.find(q => q.id === viewingQuestionId);
        if (!viewingQuestion) return null;
        const isActive = viewingQuestion.isActive !== false;

        return (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => {
              // Close when clicking on backdrop
              setViewingQuestionId(null);
            }}
          >
            <div 
              ref={modalRef}
              className="relative w-full max-w-lg max-h-[70vh] overflow-y-auto rounded-xl border-2 border-accent/40 bg-dark-800 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-150"
              onClick={(e) => {
                // Stop propagation to prevent closing when clicking inside modal
                e.stopPropagation();
                // Close when clicking on the modal content itself
                setViewingQuestionId(null);
              }}
            >
              <div className="p-4 space-y-3">
                {/* Question */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(viewingQuestion as any).lawNumbers?.length > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-accent/20 text-accent rounded-full border border-accent/30">
                        {(viewingQuestion as any).lawNumbers.length === 1
                          ? getLawLabel((viewingQuestion as any).lawNumbers[0])
                          : (viewingQuestion as any).lawNumbers.map((num: number) => getLawLabel(num)).join(", ")
                        }
                      </span>
                    )}
                    {isActive ? (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-accent/20 text-accent rounded-full border border-accent/30">Visible</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-dark-700 text-text-secondary rounded-full">Invisible</span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-white leading-relaxed">
                    {viewingQuestion.text}
                  </h3>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5 pt-1.5 border-t border-dark-600">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Explanation</h4>
                  <div className="p-2.5 rounded-lg bg-dark-900/50 border border-dark-600">
                    <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {viewingQuestion.explanation || <span className="italic text-text-muted">No explanation provided</span>}
                    </p>
                  </div>
                </div>

                {/* Answer Options */}
                <div className="space-y-1.5 pt-1.5 border-t border-dark-600">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Answers</h4>
                  <div className="space-y-1">
                    {viewingQuestion.answerOptions
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((opt, idx) => (
                        <div
                          key={opt.id}
                          className={cn(
                            "p-2 rounded-lg border transition-all",
                            opt.isCorrect
                              ? "bg-accent/10 border-accent/30"
                              : "bg-dark-900/30 border-dark-600"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn(
                              "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-semibold",
                              opt.isCorrect
                                ? "bg-accent border-accent text-dark-900"
                                : "bg-dark-800 border-dark-600 text-text-secondary"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-xs leading-relaxed break-words",
                                opt.isCorrect ? "text-white font-medium" : "text-text-secondary"
                              )}>
                                {opt.label}
                              </p>
                            </div>
                            {opt.isCorrect && (
                              <svg className="w-3.5 h-3.5 flex-shrink-0 text-accent mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Close hint */}
                <div className="pt-1.5 border-t border-dark-600">
                  <p className="text-xs text-center text-text-muted italic">Click anywhere to close</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
