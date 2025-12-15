import { TestRunner } from "@/components/test/test-runner";

export default async function LawsTestSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <TestRunner
        sessionId={resolvedParams.sessionId}
        resultsHref={`/laws/test/${resolvedParams.sessionId}/results`}
      />
    </div>
  );
}

