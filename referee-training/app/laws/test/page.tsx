"use client";

import { useEffect, useState } from "react";
import * as React from "react";
import Link from "next/link";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
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
  const [openTab, setOpenTab] = useState<"mandatory" | "available" | "build" | null>(null);
  const mandatoryRef = React.useRef<HTMLDivElement>(null);
  const availableRef = React.useRef<HTMLDivElement>(null);
  const buildRef = React.useRef<HTMLDivElement>(null);

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

  // Scroll to section when it opens
  useEffect(() => {
    if (!openTab) return;
    
    const ref = openTab === "mandatory" ? mandatoryRef : openTab === "available" ? availableRef : buildRef;
    
    if (ref.current) {
      setTimeout(() => {
        const element = ref.current;
        if (!element) return;
        
        const y = element.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }, 150);
    }
  }, [openTab]);

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-4">
      {/* Back Button */}
      <div className="mb-4">
        <Link 
          href="/laws"
          className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </div>

      {/* Mandatory Tests Section */}
      <CollapsibleSection
        ref={mandatoryRef}
        title="Mandatory Tests"
        isOpen={openTab === "mandatory"}
        onToggle={() => setOpenTab(openTab === "mandatory" ? null : "mandatory")}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        badge={
          earliestDueDate ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold text-white border border-red-500/30 shadow-lg shadow-red-500/30" style={{ backgroundColor: '#FF1744' }}>
              {earliestDueDate}
            </span>
          ) : undefined
        }
      >
        <MandatoryTestsSection />
      </CollapsibleSection>

      {/* Available Tests Section */}
      <CollapsibleSection
        ref={availableRef}
        title="Available Tests"
        isOpen={openTab === "available"}
        onToggle={() => setOpenTab(openTab === "available" ? null : "available")}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        <PoolTestsCarousel />
      </CollapsibleSection>

      {/* Build Your Own Test Section */}
      <CollapsibleSection
        ref={buildRef}
        title="Build Your Own Test"
        isOpen={openTab === "build"}
        onToggle={() => setOpenTab(openTab === "build" ? null : "build")}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        }
      >
        <TestConfiguration />
      </CollapsibleSection>
    </div>
  );
}

