"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { MultiSelect } from "@/components/ui/multi-select";
import { QuestionPicker } from "./QuestionPicker";
import { useLawTags } from "@/components/hooks/useLawTags";

type MandatoryTest = {
  id: string;
  title: string;
  description?: string | null;
  lawNumbers: number[];
  questionIds?: string[];
  totalQuestions: number;
  passingScore?: number | null;
  dueDate?: string | null;
  isActive: boolean;
  isMandatory: boolean;
  includeVar?: boolean;
  completions?: Array<{ id: string }>;
};

type EditFormState = Partial<MandatoryTest> & {
  selectionMode?: "random" | "specific";
};

export function MandatoryTestList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [tests, setTests] = useState<MandatoryTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({});
  const [backfillSuccess, setBackfillSuccess] = useState<string | null>(null);
  const { lawOptions, getLawLabel, isLoading: isLoadingLawTags } = useLawTags();
  const lawOptionsMemo = useMemo(() => lawOptions, [lawOptions]);

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mandatory-tests");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load tests");
      setTests(data.tests ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tests";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const backfillLawNumbers = async () => {
    setActionLoading("backfill");
    setBackfillSuccess(null);
    try {
      const res = await fetch("/api/admin/mandatory-tests/backfill-laws", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to backfill");
      setBackfillSuccess(data.message);
      await fetchTests();
      setTimeout(() => setBackfillSuccess(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to backfill";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/mandatory-tests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update test");
      await fetchTests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update test";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test? This action cannot be undone.")) {
      return;
    }
    
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/mandatory-tests/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete test");
      await fetchTests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete test";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (test: MandatoryTest) => {
    setEditingId(test.id);
    const hasSpecificQuestions = test.questionIds && test.questionIds.length > 0;
    setEditForm({
      title: test.title,
      description: test.description,
      lawNumbers: test.lawNumbers,
      questionIds: test.questionIds || [],
      selectionMode: hasSpecificQuestions ? "specific" : "random",
      totalQuestions: test.totalQuestions,
      passingScore: test.passingScore,
      dueDate: test.dueDate ? new Date(test.dueDate).toISOString().split('T')[0] : "",
      isActive: test.isActive,
      isMandatory: test.isMandatory,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setActionLoading(id);
    try {
      const isSpecific = editForm.selectionMode === "specific";
      const res = await fetch(`/api/admin/mandatory-tests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          lawNumbers: isSpecific ? [] : editForm.lawNumbers,
          questionIds: isSpecific ? editForm.questionIds : [],
          totalQuestions: isSpecific ? (editForm.questionIds?.length || 0) : editForm.totalQuestions,
          passingScore: editForm.passingScore || null,
          dueDate: editForm.dueDate || null,
          isActive: editForm.isActive,
          isMandatory: editForm.isMandatory,
        }),
      });
      if (!res.ok) throw new Error("Failed to update test");
      await fetchTests();
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update test";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-text-secondary">Loading tests…</p>}
      {error && <p className="text-sm text-status-danger">{error}</p>}
      {backfillSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-accent">{backfillSuccess}</p>
        </div>
      )}

      {!loading && tests.length === 0 ? (
        <p className="text-sm text-text-secondary">No tests configured yet.</p>
      ) : (
        <>
          {/* Backfill Button - Shows if any tests have questionIds but no lawNumbers */}
          {tests.some(t => t.questionIds && t.questionIds.length > 0 && t.lawNumbers.length === 0) && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/50 border border-dark-600">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">Missing law numbers detected</p>
                <p className="text-xs text-text-secondary mt-1">
                  Some tests with specific questions don't have law numbers. Click to extract them automatically.
                </p>
              </div>
              <button
                onClick={backfillLawNumbers}
                disabled={actionLoading === "backfill"}
                className="px-3 py-1.5 text-xs font-medium bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                {actionLoading === "backfill" ? "Updating..." : "Fix Now"}
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-dark-600">
          <table className="min-w-full divide-y divide-dark-600">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Laws
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Questions
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Pass Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-accent/80">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600 bg-dark-900/50">
              {tests.map((test) => {
                const isEditing = editingId === test.id;
                
                if (isEditing) {
                  return (
                    <tr key={test.id} className="bg-dark-800/50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* Mandatory Toggle - Top of Edit Form */}
                          <div className="flex items-center justify-between p-4 rounded-lg border border-dark-600 bg-dark-800/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <label className="text-sm font-medium text-white">
                                  Mandatory Test
                                </label>
                                {editForm.isMandatory && (
                                  <span className="px-2 py-0.5 text-xs font-semibold bg-accent/20 text-accent rounded-full border border-accent/30">
                                    REQUIRED
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary">
                                {editForm.isMandatory 
                                  ? "Will be assigned to all users and appear in their training dashboard" 
                                  : "Will be added to the pool but not automatically assigned"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, isMandatory: !editForm.isMandatory })}
                              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-900 ${
                                editForm.isMandatory ? "bg-accent shadow-lg shadow-accent/20" : "bg-dark-600"
                              }`}
                              aria-label={editForm.isMandatory ? "Switch to pool test" : "Make mandatory"}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                                  editForm.isMandatory ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-white">Title</label>
                              <Input
                                value={editForm.title || ""}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                required
                              />
                            </div>
                            {editForm.isMandatory && (
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-white">
                                  Due date
                                  <span className="text-amber-400 ml-1 text-xs">(recommended)</span>
                                </label>
                                <Input
                                  type="date"
                                  value={editForm.dueDate || ""}
                                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
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
                              value={editForm.description || ""}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="Optional description for this test..."
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-white">Question Selection</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name="editSelectionMode"
                                  value="random"
                                  checked={editForm.selectionMode === "random"}
                                  onChange={() => setEditForm({ ...editForm, selectionMode: "random" })}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 bg-dark-900 transition-all flex items-center justify-center ${
                                  editForm.selectionMode === "random" ? "border-accent" : "border-dark-600"
                                }`}>
                                  {editForm.selectionMode === "random" && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                                  )}
                                </div>
                                <span className="text-sm text-white group-hover:text-accent transition-colors">Random from selected laws</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name="editSelectionMode"
                                  value="specific"
                                  checked={editForm.selectionMode === "specific"}
                                  onChange={() => setEditForm({ ...editForm, selectionMode: "specific" })}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 bg-dark-900 transition-all flex items-center justify-center ${
                                  editForm.selectionMode === "specific" ? "border-accent" : "border-dark-600"
                                }`}>
                                  {editForm.selectionMode === "specific" && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                                  )}
                                </div>
                                <span className="text-sm text-white group-hover:text-accent transition-colors">Choose specific questions</span>
                              </label>
                            </div>
                          </div>

                          {editForm.selectionMode === "random" ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-white">Select laws</label>
                                <p className="text-xs text-text-secondary mb-2">Questions will be randomly selected from these laws</p>
                                <MultiSelect
                                  value={editForm.lawNumbers || []}
                                  onChange={(val) => setEditForm({ ...editForm, lawNumbers: val as number[] })}
                                  options={lawOptionsMemo}
                                  placeholder="Add Law"
                                />
                                {lawOptionsMemo.length === 0 && (
                                  <p className="text-xs text-text-muted">
                                    {isLoadingLawTags ? "Loading law tags..." : "No law tags available"}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-white">Questions</label>
                                  <NumberInput
                                    value={editForm.totalQuestions || 10}
                                    onChange={(val) => setEditForm({ ...editForm, totalQuestions: val })}
                                    min={1}
                                    max={50}
                                    required
                                    className="w-24"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-white">Passing score (optional)</label>
                                  <NumberInput
                                    value={editForm.passingScore ?? 0}
                                    onChange={(val) => setEditForm({ ...editForm, passingScore: val > 0 ? val : null })}
                                    min={0}
                                    max={editForm.totalQuestions || 50}
                                    placeholder="None"
                                    className="w-24"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-white">Select specific questions</label>
                                <p className="text-xs text-text-secondary mb-2">Choose the exact questions for this test</p>
                                <QuestionPicker
                                  selectedQuestionIds={editForm.questionIds || []}
                                  onQuestionsChange={(ids) => setEditForm({ ...editForm, questionIds: ids })}
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-sm font-medium text-white">Passing score (optional)</label>
                                <NumberInput
                                  value={editForm.passingScore ?? 0}
                                  onChange={(val) => setEditForm({ ...editForm, passingScore: val > 0 ? val : null })}
                                  min={0}
                                  max={(editForm.questionIds?.length || 0) || 50}
                                  placeholder="None"
                                  className="w-24"
                                />
                              </div>
                            </>
                          )}

                          <div className="flex items-center gap-3 pt-2">
                            <Button
                              onClick={() => saveEdit(test.id)}
                              disabled={
                                actionLoading === test.id || 
                                !editForm.title || 
                                (editForm.selectionMode === "random" && (editForm.lawNumbers?.length || 0) === 0) ||
                                (editForm.selectionMode === "specific" && (editForm.questionIds?.length || 0) === 0)
                              }
                            >
                              {actionLoading === test.id ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={actionLoading === test.id}
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
                  <tr key={test.id} className="hover:bg-dark-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-white">
                      <div className="font-medium">{test.title}</div>
                      {test.description ? (
                        <p className="text-xs text-text-secondary line-clamp-2 mt-1">{test.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      <div className="flex flex-wrap gap-1">
                        {test.lawNumbers.map((num) => (
                          <span key={num} className="rounded-full bg-dark-700 px-2 py-1 text-xs text-text-secondary">
                            {getLawLabel(num)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{test.totalQuestions}</td>
                    <td className="px-4 py-3 text-sm text-white">
                      {test.passingScore ? (
                        <span className="text-white">{test.passingScore}</span>
                      ) : (
                        <span className="text-text-muted italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {test.dueDate ? new Date(test.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      <div className="flex flex-wrap items-center gap-2">
                        {test.isMandatory ? (
                          <span className="rounded-full bg-accent/20 border border-accent/30 px-2 py-1 text-xs font-medium text-accent">
                            Mandatory
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-1 text-xs font-medium text-blue-400">
                            Pool
                          </span>
                        )}
                        {!test.isActive && (
                          <span className="rounded-full bg-dark-700 border border-dark-600 px-2 py-1 text-xs text-text-muted">
                            Hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(test)}
                          disabled={actionLoading === test.id}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-dark-700 transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleActive(test.id, test.isActive)}
                          disabled={actionLoading === test.id}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-dark-700 transition-colors disabled:opacity-50"
                          title={test.isActive ? "Hide Test (Draft Mode)" : "Show Test (Make Visible)"}
                        >
                          {test.isActive ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => deleteTest(test.id)}
                          disabled={actionLoading === test.id}
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
        </>
      )}
    </div>
  );
}
