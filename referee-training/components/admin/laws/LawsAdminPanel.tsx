"use client";

import { useState } from "react";
import { QuestionForm } from "./QuestionForm";
import { QuestionList } from "./QuestionList";
import { MandatoryTestForm } from "./MandatoryTestForm";
import { MandatoryTestList } from "./MandatoryTestList";

export function LawsAdminPanel() {
  const [questionVersion, setQuestionVersion] = useState(0);
  const [mandatoryVersion, setMandatoryVersion] = useState(0);
  const [testsTab, setTestsTab] = useState<"create" | "manage">("create");
  const [activeTab, setActiveTab] = useState<"add" | "questions" | "tests">("questions");

  return (
    <div className="space-y-6">
      {/* Main Tabs */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl">
        <button
          onClick={() => setActiveTab("questions")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
            activeTab === "questions"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          }`}
        >
          Search Questions
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
            activeTab === "add"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          }`}
        >
          Add Question
        </button>
        <button
          onClick={() => setActiveTab("tests")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
            activeTab === "tests"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          }`}
        >
          Tests
        </button>
      </div>

      {activeTab === "add" && (
        <QuestionForm onCreated={() => setQuestionVersion((v) => v + 1)} />
      )}

      {activeTab === "questions" && (
        <QuestionList refreshKey={questionVersion} />
      )}

      {activeTab === "tests" && (
        <div className="space-y-4">
          {/* Test Sub-Tabs */}
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

          <div className="pt-2">
            {testsTab === "create" ? (
              <MandatoryTestForm onCreated={() => setMandatoryVersion((v) => v + 1)} />
            ) : (
              <MandatoryTestList refreshKey={mandatoryVersion} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
