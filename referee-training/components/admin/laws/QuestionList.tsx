"use client";

// Updated column widths for better layout
import { useEffect, useState, useRef, useMemo } from "react";
import React from "react";
import { Question } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLawTags } from "@/components/hooks/useLawTags";
import { useModal } from "@/components/ui/modal";

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
  text: string;
  explanation: string;
  difficulty: number;
  answers: EditFormAnswer[];
};

const VAR_FILTER_OPTIONS = [
  { value: "exclude", label: "Exclude VAR" },
  { value: "include", label: "Include VAR" },
  { value: "only", label: "Only VAR" },
];

export function QuestionList({ refreshKey = 0 }: { refreshKey?: number }) {
  const modal = useModal();
  const [lawFilter, setLawFilter] = useState<number | string>("");
  const [lawSortOrder, setLawSortOrder] = useState<"asc" | "desc" | null>(null);
  const [varFilter, setVarFilter] = useState<string>("exclude");
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
  const [isEditLawDropdownOpen, setIsEditLawDropdownOpen] = useState(false);
  const editLawDropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { lawTags, getLawLabel, isLoading: isLoadingLawTags } = useLawTags();

  const PER_PAGE_OPTIONS = [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 50, label: "50" },
  ];

  const lawFilterOptions = useMemo(
    () => [
      { value: "", label: isLoadingLawTags ? "Loading laws..." : "All" },
      { value: "unassigned", label: "No Law Assigned" },
      ...lawTags.map((tag) => ({ value: tag.number, label: tag.name })),
    ],
    [lawTags, isLoadingLawTags]
  );

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("type", "LOTG_TEXT");
      if (lawFilter !== "") params.set("lawNumber", String(lawFilter));
      
      if (varFilter === "include") params.set("includeVar", "true");
      if (varFilter === "only") params.set("onlyVar", "true");
      
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
    setIsEditLawDropdownOpen(false);
    setEditForm({
      lawNumbers: [],
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

  const toggleEditLaw = (lawNumber: number) => {
    setEditForm((prev) => ({
      ...prev,
      lawNumbers: prev.lawNumbers.includes(lawNumber)
        ? prev.lawNumbers.filter((num) => num !== lawNumber)
        : [...prev.lawNumbers, lawNumber].sort((a, b) => a - b),
    }));
  };

  const clearEditLaws = () => {
    setEditForm((prev) => ({ ...prev, lawNumbers: [] }));
  };

  const saveEdit = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawNumbers: editForm.lawNumbers,
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
      setIsEditLawDropdownOpen(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editLawDropdownRef.current && !editLawDropdownRef.current.contains(event.target as Node)) {
        setIsEditLawDropdownOpen(false);
      }
    };

    if (isEditLawDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditLawDropdownOpen]);

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
  }, [refreshKey, lawFilter, varFilter]);

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
  }, [search, lawFilter, varFilter, perPage, lawSortOrder]);

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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-secondary">Law</label>
              <Select
                value={lawFilter}
                onChange={(val) => {
                  setLawFilter(val === "" || val === "unassigned" ? val : Number(val));
                  setLawSortOrder(null); // Reset sort order when manually changing filter
                }}
                options={lawFilterOptions}
                className="w-48"
              />
              <Select
                value={varFilter}
                onChange={(val) => setVarFilter(String(val))}
                options={VAR_FILTER_OPTIONS}
                className="w-40"
              />
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question text"
              className="md:max-w-sm"
            />
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
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-white">Law Numbers (select multiple)</label>
                                <div className="relative" ref={editLawDropdownRef}>
                                  <button
                                    type="button"
                                    onClick={() => setIsEditLawDropdownOpen(!isEditLawDropdownOpen)}
                                    className="w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-left bg-dark-900 border border-dark-600 text-white hover:border-accent/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                                  >
                                    <span className={editForm.lawNumbers.length === 0 ? "text-text-muted" : ""}>
                                      {editForm.lawNumbers.length === 0 
                                        ? "No laws selected" 
                                        : editForm.lawNumbers.length === 1
                                        ? getLawLabel(editForm.lawNumbers[0])
                                        : `${editForm.lawNumbers.length} laws selected`
                                      }
                                    </span>
                                    <svg 
                                      className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isEditLawDropdownOpen ? "rotate-180" : ""}`}
                                      fill="none" 
                                      viewBox="0 0 24 24" 
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  
                                  {isEditLawDropdownOpen && (
                                    <div className="absolute top-full mt-2 z-50 w-full rounded-lg border border-dark-600 bg-dark-800 shadow-elevated max-h-60 overflow-auto">
                                      <div className="p-1">
                                        {editForm.lawNumbers.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={clearEditLaws}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors text-left text-text-secondary hover:text-white hover:bg-dark-700 border-b border-dark-600 mb-1"
                                          >
                                            <span>Clear all</span>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        )}
                                        
                                        {lawTags.length > 0 ? (
                                          lawTags.map((tag) => {
                                            const isSelected = editForm.lawNumbers.includes(tag.number);
                                            return (
                                              <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleEditLaw(tag.number)}
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
                          <span className="rounded-full bg-accent/20 border border-accent/30 px-2 py-1 text-xs text-accent">Active</span>
                        ) : (
                          <span className="rounded-full bg-dark-700 px-2 py-1 text-xs text-text-secondary">Inactive</span>
                        )}
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
                            title={isActive ? "Deactivate" : "Activate"}
                          >
                            {isActive ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      <span className="px-2 py-0.5 text-xs font-semibold bg-accent/20 text-accent rounded-full border border-accent/30">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-dark-700 text-text-secondary rounded-full">Inactive</span>
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
