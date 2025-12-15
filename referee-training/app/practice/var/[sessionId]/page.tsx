import { TestRunner } from "@/components/test/test-runner";

export default async function VarSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="mx-auto max-w-screen-md px-6 py-10">
      <TestRunner
        sessionId={resolvedParams.sessionId}
        resultsHref={`/practice/var/${resolvedParams.sessionId}/results`}
      />
    </div>
  );
}

