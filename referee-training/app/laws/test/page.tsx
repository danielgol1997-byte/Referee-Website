"use client";

import { useEffect, useState } from "react";
import * as React from "react";
import Link from "next/link";
import { MandatoryTestsSection } from "@/components/laws/MandatoryTestsSection";
import { PoolTestsCarousel } from "@/components/laws/PoolTestsCarousel";
import { TestConfiguration } from "@/components/laws/TestConfiguration";

type MandatoryTest = {
  id: string;
  title: string;
  dueDate?: string | null;
};

export default function LawsTestStartPage() {
  const [earliestDueDate, setEarliestDueDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "mandatory" | "build">("available");

  useEffect(() => {
    const fetchMandatoryTests = async () => {
      try {
        const res = await fetch("/api/tests/laws/mandatory");
        const data = await res.json();
        if (res.ok && data.tests) {
          const tests: MandatoryTest[] = data.tests;
          // Find the earliest due date
          const datesWithTests = tests
            .filter((test) => test.dueDate)
            .map((test) => ({
              test,
              date: new Date(test.dueDate!),
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

          if (datesWithTests.length > 0) {
            const earliest = datesWithTests[0];
            const today = new Date();
            const diffDays = Math.ceil(
              (earliest.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            let formatted: string;
            if (diffDays < 0) {
              formatted = "Overdue";
            } else if (diffDays === 0) {
              formatted = "Due Today";
            } else if (diffDays === 1) {
              formatted = "Due Tomorrow";
            } else {
              formatted = `Due ${earliest.date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}`;
            }
            setEarliestDueDate(formatted);
          }
        }
      } catch (err) {
        // Silently fail - badge is optional
        console.error("Failed to fetch mandatory tests for badge:", err);
      }
    };

    fetchMandatoryTests();
  }, []);

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Header with Back Button and Tabs */}
      <div className="space-y-6">
        <Link 
          href="/laws"
          className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>

        {/* Admin-style Tabs */}
        <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl overflow-x-auto">
          <button
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
            onClick={() => setActiveTab("build")}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "build"
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
                : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
            }`}
          >
            Build Your Own Test
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        {activeTab === "available" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PoolTestsCarousel />
          </div>
        )}

        {activeTab === "mandatory" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <MandatoryTestsSection />
          </div>
        )}

        {activeTab === "build" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <TestConfiguration />
          </div>
        )}
      </div>
    </div>
  );
}

