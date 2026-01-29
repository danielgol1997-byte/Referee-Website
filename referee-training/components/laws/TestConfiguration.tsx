"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { CompactSpinner } from "@/components/ui/compact-spinner";
import { useLawTags } from "@/components/hooks/useLawTags";
import { DualSourceToggle } from "@/components/ui/dual-source-toggle";
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 20;

export function TestConfiguration() {
  const router = useRouter();
  const [selectedLaws, setSelectedLaws] = useState<number[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [includeVar, setIncludeVar] = useState(false);
  const [includeIfab, setIncludeIfab] = useState(true);
  const [includeCustom, setIncludeCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [testName, setTestName] = useState("");
  const [existingTestNames, setExistingTestNames] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const { lawOptions, getLawLabel, isLoading: isLoadingLawTags } = useLawTags();
  const lawOptionsMemo = useMemo(() => lawOptions, [lawOptions]);

  // Fetch existing user test names for duplicate checking
  useEffect(() => {
    const fetchExistingTests = async () => {
      try {
        const res = await fetch("/api/tests/laws/pool");
        if (res.ok) {
          const data = await res.json();
          const userTests = (data.tests ?? []).filter((t: any) => t.isUserGenerated);
          setExistingTestNames(userTests.map((t: any) => t.title.toLowerCase().trim()));
        }
      } catch (err) {
        console.error("Failed to fetch existing tests:", err);
      }
    };
    fetchExistingTests();
  }, []);


  // Generate default name
  const generateDefaultName = () => {
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (selectedLaws.length > 0) {
      const lawsStr = selectedLaws.length === 1 
        ? getLawLabel(selectedLaws[0])
        : selectedLaws
            .slice()
            .sort((a, b) => a - b)
            .map((num) => getLawLabel(num))
            .join(", ");
      return `${lawsStr} Practice - ${dateStr}`;
    }
    return `Practice Test - ${dateStr}`;
  };

  // Validate test name for duplicates
  const validateTestName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError(null); // Will use default name
      return true;
    }
    const normalizedName = name.toLowerCase().trim();
    if (existingTestNames.includes(normalizedName)) {
      setNameError("A test with this name already exists. Please choose a different name.");
      return false;
    }
    setNameError(null);
    return true;
  };

  const start = async () => {
    setLoading(true);
    setError(null);
    setNameError(null);
    
    try {
      // If user wants to save, validate name and create a test first
      let testId: string | undefined;
      
      if (saveToProfile) {
        // Validate test name (only if user provided a custom name)
        const hasCustomName = testName.trim() && testName.trim() !== generateDefaultName();
        if (hasCustomName && !validateTestName(testName.trim())) {
          setLoading(false);
          return;
        }
        
        // Use custom name or generate default
        const finalName = testName.trim() || generateDefaultName();
        
        // Check if default name would be duplicate
        if (!hasCustomName) {
          const defaultNameLower = finalName.toLowerCase().trim();
          if (existingTestNames.includes(defaultNameLower)) {
            // If default would be duplicate, append a number
            let counter = 1;
            let uniqueName = finalName;
            while (existingTestNames.includes(uniqueName.toLowerCase().trim())) {
              uniqueName = `${finalName} (${counter})`;
              counter++;
            }
            const finalNameLower = uniqueName.toLowerCase().trim();
            setExistingTestNames(prev => [...prev, finalNameLower]);
            // Use the unique name
            const createRes = await fetch("/api/admin/mandatory-tests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: uniqueName,
                description: selectedLaws.length > 0 
                  ? `Laws: ${selectedLaws.map((num) => getLawLabel(num)).join(", ")}`
                  : "All laws",
                categorySlug: "laws-of-the-game",
                lawNumbers: selectedLaws,
            totalQuestions: questionCount,
            isActive: true,
            isMandatory: false,
            isUserGenerated: true,
            includeIfab,
            includeCustom,
          }),
        });
        
        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data?.error ?? "Failed to create test");
        }
        
        const data = await createRes.json();
            testId = data.test?.id;
            
            // Continue to start test
            const res = await fetch("/api/tests/laws/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lawNumbers: selectedLaws.length > 0 ? selectedLaws : undefined,
                totalQuestions: questionCount,
                mandatoryTestId: testId,
              }),
            });
            const testData = await res.json();
            if (!res.ok) {
              throw new Error(testData?.error ?? "Could not start test");
            }
            router.push(`/laws/test/${testData.session.id}`);
            return;
          }
        }

        const createRes = await fetch("/api/admin/mandatory-tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: finalName,
            description: selectedLaws.length > 0 
              ? `Laws: ${selectedLaws.map((num) => getLawLabel(num)).join(", ")}`
              : "All laws",
            categorySlug: "laws-of-the-game",
            lawNumbers: selectedLaws,
            totalQuestions: questionCount,
            isActive: true,
            isMandatory: false,
            isUserGenerated: true,
            includeIfab,
            includeCustom,
          }),
        });
        
        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data?.error ?? "Failed to create test");
        }
        
        const data = await createRes.json();
        testId = data.test?.id;
        
        // Update existing test names list to include the new one
        setExistingTestNames(prev => [...prev, finalName.toLowerCase().trim()]);
      }

      // Start the test
      const res = await fetch("/api/tests/laws/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawNumbers: selectedLaws.length > 0 ? selectedLaws : undefined,
          totalQuestions: questionCount,
          mandatoryTestId: testId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not start test");
      }
      router.push(`/laws/test/${data.session.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start test";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Laws Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white">
          Choose laws to focus on
        </label>
        <MultiSelect
          value={selectedLaws}
          onChange={(values) => setSelectedLaws(values.map((v) => Number(v)).filter((n) => Number.isFinite(n)))}
          options={lawOptionsMemo}
          placeholder="Select laws (or leave empty for all)"
        />
        {lawOptionsMemo.length === 0 && (
          <p className="text-xs text-text-muted">
            {isLoadingLawTags ? "Loading law tags..." : "No law tags available"}
          </p>
        )}
        <p className="text-xs text-text-secondary">
          Leave empty to draw from all Laws of the Game questions
        </p>
      </div>

      {/* Test Options */}
      <div className="space-y-3">
        {/* VAR Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-dark-600 bg-dark-800/30">
          <div className="flex-1">
            <label className="text-sm font-medium text-white cursor-pointer" htmlFor="var-toggle">
              Include VAR Questions
            </label>
            <p className="text-xs text-text-secondary mt-1">
              Include questions related to Video Assistant Referee protocols
            </p>
          </div>
          <button
            id="var-toggle"
            type="button"
            onClick={() => setIncludeVar(!includeVar)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-900 ${
              includeVar ? "bg-accent" : "bg-dark-600"
            }`}
            role="switch"
            aria-checked={includeVar}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                includeVar ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Question Sources Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-dark-600 bg-dark-800/30">
          <div className="flex-1">
            <label className="text-sm font-medium text-white">
              Question Sources
            </label>
            <p className="text-xs text-text-secondary mt-1">
              Choose which question sources to include in your test
            </p>
          </div>
          <DualSourceToggle
            includeIfab={includeIfab}
            includeCustom={includeCustom}
            onIfabChange={setIncludeIfab}
            onCustomChange={setIncludeCustom}
          />
        </div>
      </div>

      {/* Question Count */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-white">
          Questions
        </label>
        <CompactSpinner
          value={questionCount}
          onChange={setQuestionCount}
          min={MIN_QUESTIONS}
          max={MAX_QUESTIONS}
        />
      </div>

      {/* Save Option */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-dark-600 bg-dark-800/30">
          <div className="flex-1">
            <label className="text-sm font-medium text-white cursor-pointer">
              Save to My Tests
            </label>
            <p className="text-xs text-text-secondary mt-1">
              Add this test configuration to your user-generated tests
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSaveToProfile(!saveToProfile);
              if (!saveToProfile) {
                // When enabling, set default name if empty
                if (!testName.trim()) {
                  setTestName(generateDefaultName());
                }
              }
            }}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-900 ${
              saveToProfile ? "bg-accent shadow-lg shadow-accent/20" : "bg-dark-600"
            }`}
            aria-label={saveToProfile ? "Don't save test" : "Save test"}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                saveToProfile ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Test Name Input - Only show when saving */}
        {saveToProfile && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Test Name
            </label>
            <Input
              value={testName}
              onChange={(e) => {
                setTestName(e.target.value);
                if (nameError) {
                  validateTestName(e.target.value);
                }
              }}
              onBlur={() => {
                if (testName.trim()) {
                  validateTestName(testName);
                }
              }}
              placeholder={generateDefaultName()}
              className={nameError ? "border-status-danger/50 focus:border-status-danger focus:ring-status-danger/20" : ""}
            />
            {nameError && (
              <p className="text-xs text-status-danger">{nameError}</p>
            )}
            <p className="text-xs text-text-secondary">
              {testName.trim() 
                ? "Leave empty to use default name" 
                : `Default: "${generateDefaultName()}"`}
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="flex flex-col gap-3 pt-2">
        <Button 
          onClick={start} 
          disabled={loading}
          size="xl"
          className="w-full group relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating test...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Practice Test
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-accent via-cyan-400 to-accent opacity-0 group-hover:opacity-20 transition-opacity" />
        </Button>
        
        {error && (
          <div className="p-3 rounded-lg bg-status-dangerBg border border-status-danger/30">
            <p className="text-sm text-status-danger text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
