"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLawTags } from "@/components/hooks/useLawTags";

const QUESTIONS_PER_PAGE = 20;

type Question = {
  id: string;
  text: string;
  lawNumbers?: number[];
};

interface QuestionPickerProps {
  selectedQuestionIds: string[];
  onQuestionsChange: (questionIds: string[]) => void;
  includeIfab?: boolean;
  includeCustom?: boolean;
}

export function QuestionPicker({ 
  selectedQuestionIds, 
  onQuestionsChange,
  includeIfab = true,
  includeCustom = false,
}: QuestionPickerProps) {
  const [search, setSearch] = useState("");
  const [lawFilter, setLawFilter] = useState<number | "">("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectedCollapsed, setIsSelectedCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { lawTags, getLawLabel, isLoading: isLoadingLawTags } = useLawTags();

  const lawFilterOptions = useMemo(
    () => [
      { value: "", label: isLoadingLawTags ? "Loading laws..." : "All Laws" },
      ...lawTags.map((tag) => ({ value: tag.number, label: tag.name })),
    ],
    [lawTags, isLoadingLawTags]
  );

  const fetchSelectedQuestions = useCallback(async () => {
    if (selectedQuestionIds.length === 0) {
      setSelectedQuestions([]);
      return;
    }

    setLoadingSelected(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "LOTG_TEXT");
      params.set("categorySlug", "laws-of-the-game");
      params.set("ids", selectedQuestionIds.join(","));
      
      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        // Preserve the order of selectedQuestionIds
        const ordered = selectedQuestionIds
          .map((id) => data.questions?.find((q: Question) => q.id === id))
          .filter(Boolean) as Question[];
        setSelectedQuestions(ordered);
      }
    } catch (err) {
      console.error("Failed to load selected questions", err);
    } finally {
      setLoadingSelected(false);
    }
  }, [selectedQuestionIds]);

  // Fetch selected questions automatically when selectedQuestionIds changes
  useEffect(() => {
    fetchSelectedQuestions();
  }, [fetchSelectedQuestions]);

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
    }
  }, [isOpen, lawFilter, includeIfab, includeCustom]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, lawFilter]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "LOTG_TEXT");
      params.set("categorySlug", "laws-of-the-game");
      if (lawFilter !== "") params.set("lawNumber", String(lawFilter));
      
      // Apply source filtering
      if (includeIfab && !includeCustom) {
        params.set("isIfab", "true");
      } else if (!includeIfab && includeCustom) {
        params.set("isIfab", "false");
      }
      // If both or neither, don't add filter (show all)
      
      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions ?? []);
      }
    } catch (err) {
      console.error("Failed to load questions", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? questions.filter((q) => q.text.toLowerCase().includes(search.toLowerCase()))
    : questions;

  const availableQuestions = filtered.filter((q) => !selectedQuestionIds.includes(q.id));

  // Pagination calculations
  const totalPages = Math.ceil(availableQuestions.length / QUESTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const endIndex = startIndex + QUESTIONS_PER_PAGE;
  const paginatedQuestions = availableQuestions.slice(startIndex, endIndex);

  const addQuestion = (questionId: string) => {
    onQuestionsChange([...selectedQuestionIds, questionId]);
    // Don't close the picker - keep it open for multiple selections
  };

  const removeQuestion = (questionId: string) => {
    onQuestionsChange(selectedQuestionIds.filter((id) => id !== questionId));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-3">
      {/* Selected Questions Display - Always visible when there are selected questions */}
      {selectedQuestionIds.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dark-600 bg-dark-800/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsSelectedCollapsed(!isSelectedCollapsed)}
            className="w-full flex items-center justify-between p-3 hover:bg-dark-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg 
                className={`w-4 h-4 text-text-secondary transition-transform ${isSelectedCollapsed ? '' : 'rotate-90'}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <p className="text-sm font-medium text-white">
                {selectedQuestionIds.length} question{selectedQuestionIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            {loadingSelected && (
              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            )}
          </button>
          
          {!isSelectedCollapsed && (
            <div className="px-3 pb-3 space-y-2 max-h-60 overflow-y-auto">
              {loadingSelected ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-text-secondary">Loading questions...</p>
                </div>
              ) : selectedQuestions.length > 0 ? (
                selectedQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-dark-900 border border-dark-600"
                  >
                    <div className="flex-1 text-sm text-white line-clamp-2">
                      {question.lawNumbers && question.lawNumbers.length > 0 && (
                        <span className="text-xs text-accent font-medium mr-2">
                          {question.lawNumbers.length === 1 
                            ? getLawLabel(question.lawNumbers[0])
                            : question.lawNumbers.map((num) => getLawLabel(num)).join(", ")
                          }
                        </span>
                      )}
                      {question.text}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      className="flex-shrink-0 p-1 text-text-secondary hover:text-status-danger transition-colors"
                      title="Remove question"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-text-secondary">Loading selected questions...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Question Button & Modal */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-dark-800 border border-dark-600 text-white hover:border-accent/30 hover:bg-dark-700 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {selectedQuestionIds.length > 0 ? 'Add More Questions' : 'Add Questions'}
        </button>
      ) : (
        <div className="space-y-3 p-4 rounded-lg border border-accent/20 bg-dark-800/50">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Select Questions</h4>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearch("");
                setCurrentPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Done
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select
              value={lawFilter}
              onChange={(val) => setLawFilter(val === "" ? "" : Number(val))}
              options={lawFilterOptions}
              className="w-40"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="flex-1"
            />
          </div>

          {/* Question List */}
          {loading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">Loading questions...</p>
            </div>
          ) : availableQuestions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">
                {selectedQuestionIds.length > 0 
                  ? "All available questions have been selected" 
                  : "No questions available"}
              </p>
            </div>
          ) : (
            <>
              {/* Results Info */}
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, availableQuestions.length)} of {availableQuestions.length}
                </span>
                {totalPages > 1 && (
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              {/* Question Cards */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {paginatedQuestions.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => addQuestion(question.id)}
                    className="w-full text-left p-3 rounded-lg bg-dark-900 hover:bg-dark-700 border border-dark-600 hover:border-accent/30 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 text-sm text-white">
                        {question.lawNumbers && question.lawNumbers.length > 0 && (
                          <span className="text-xs text-accent font-medium mr-2">
                            {question.lawNumbers.length === 1 
                            ? getLawLabel(question.lawNumbers[0])
                            : question.lawNumbers.map((num) => getLawLabel(num)).join(", ")
                            }
                          </span>
                        )}
                        <span className="line-clamp-2">{question.text}</span>
                      </div>
                      <svg 
                        className="w-4 h-4 flex-shrink-0 text-text-secondary group-hover:text-accent transition-colors mt-0.5" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-dark-600">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-dark-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                    title="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1);
                      
                      const showEllipsis = 
                        (page === 2 && currentPage > 3) || 
                        (page === totalPages - 1 && currentPage < totalPages - 2);

                      if (showEllipsis) {
                        return (
                          <span key={page} className="px-2 text-text-secondary">
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={`min-w-[32px] px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
                            page === currentPage
                              ? "bg-accent text-white"
                              : "text-text-secondary hover:text-white hover:bg-dark-700"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-dark-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                    title="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
