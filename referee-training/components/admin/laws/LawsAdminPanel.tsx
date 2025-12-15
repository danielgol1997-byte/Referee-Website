"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { QuestionForm } from "./QuestionForm";
import { QuestionList } from "./QuestionList";
import { MandatoryTestForm } from "./MandatoryTestForm";
import { MandatoryTestList } from "./MandatoryTestList";

export function LawsAdminPanel() {
  const [questionVersion, setQuestionVersion] = useState(0);
  const [mandatoryVersion, setMandatoryVersion] = useState(0);
  const [testsTab, setTestsTab] = useState<"create" | "manage">("create");
  const [openSection, setOpenSection] = useState<"add" | "search" | "tests" | null>(null);
  const addRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const testsRef = React.useRef<HTMLDivElement>(null);

  // Scroll to section when it opens
  useEffect(() => {
    if (!openSection) return;
    
    const ref = openSection === "add" ? addRef : openSection === "search" ? searchRef : testsRef;
    
    if (ref.current) {
      setTimeout(() => {
        const element = ref.current;
        if (!element) return;
        
        const y = element.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }, 150);
    }
  }, [openSection]);

  return (
    <div className="space-y-4">
      {/* Section 1: Add Question */}
      <CollapsibleSection
        ref={addRef}
        title="Add Question"
        isOpen={openSection === "add"}
        onToggle={() => setOpenSection(openSection === "add" ? null : "add")}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      >
        <QuestionForm onCreated={() => setQuestionVersion((v) => v + 1)} />
      </CollapsibleSection>

      {/* Section 2: Search Questions */}
      <CollapsibleSection
        ref={searchRef}
        title="Search Questions"
        isOpen={openSection === "search"}
        onToggle={() => setOpenSection(openSection === "search" ? null : "search")}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
      >
        <QuestionList refreshKey={questionVersion} />
      </CollapsibleSection>

      {/* Section 3: Tests */}
      <CollapsibleSection
        ref={testsRef}
        title="Tests"
        isOpen={openSection === "tests"}
        onToggle={() => setOpenSection(openSection === "tests" ? null : "tests")}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
      >
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-dark-600">
            <button
              onClick={() => setTestsTab("create")}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all
                ${testsTab === "create" 
                  ? "text-accent border-b-2 border-accent" 
                  : "text-text-secondary hover:text-text-primary"
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
            <button
              onClick={() => setTestsTab("manage")}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all
                ${testsTab === "manage" 
                  ? "text-accent border-b-2 border-accent" 
                  : "text-text-secondary hover:text-text-primary"
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Manage
            </button>
          </div>

          {/* Tab Content */}
          <div className="pt-2">
            {testsTab === "create" ? (
              <MandatoryTestForm onCreated={() => setMandatoryVersion((v) => v + 1)} />
            ) : (
              <MandatoryTestList refreshKey={mandatoryVersion} />
            )}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
