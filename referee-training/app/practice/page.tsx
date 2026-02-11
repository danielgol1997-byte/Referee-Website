"use client";

import { useEffect, useState } from "react";
import { MandatoryVideoTestsSection } from "@/components/practice/MandatoryVideoTestsSection";
import { PoolVideoTestsSection } from "@/components/practice/PoolVideoTestsSection";
import { CreateVideoTestSection } from "@/components/practice/CreateVideoTestSection";

type MandatoryVideoTest = {
  id: string;
  name: string;
  totalClips: number;
  dueDate?: string | null;
};

export default function PracticePage() {
  const [earliestDueDate, setEarliestDueDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "mandatory" | "create">("available");
  const [poolRefreshKey, setPoolRefreshKey] = useState(0);
  const [focusMyTestId, setFocusMyTestId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tests/videos/mandatory")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.tests) return;
        const tests: MandatoryVideoTest[] = data.tests;
        const withDue = tests
          .filter((t) => t.dueDate)
          .map((t) => ({ test: t, date: new Date(t.dueDate!) }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        if (withDue.length > 0) {
          const d = withDue[0].date;
          const today = new Date();
          const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          setEarliestDueDate(
            diffDays < 0 ? "Overdue" : diffDays === 0 ? "Due Today" : diffDays === 1 ? "Due Tomorrow" : `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Admin-style Tabs */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("available")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === "available"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          }`}
        >
          Tests
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab("mandatory")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all whitespace-nowrap relative ${
            activeTab === "mandatory"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          }`}
        >
          Mandatory Tests
          {earliestDueDate && (
            <span 
              className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activeTab === "mandatory" 
                  ? "bg-red-500 text-white border-red-600" 
                  : "bg-red-500/20 text-red-500 border-red-500/30"
              }`}
            >
              {earliestDueDate}
            </span>
          )}
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === "create"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          }`}
        >
          Create Your Test
        </button>
      </div>

      <div className="min-h-[500px]">
        {activeTab === "available" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PoolVideoTestsSection refreshKey={poolRefreshKey} focusMyTestId={focusMyTestId} />
          </div>
        )}

        {activeTab === "mandatory" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <MandatoryVideoTestsSection />
          </div>
        )}

        {activeTab === "create" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CreateVideoTestSection
              onCreated={(testId) => {
                setPoolRefreshKey((k) => k + 1);
                if (testId) setFocusMyTestId(testId);
                setActiveTab("available");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
