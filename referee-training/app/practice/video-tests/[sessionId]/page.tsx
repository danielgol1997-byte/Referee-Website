import { VideoTestRunner } from "@/components/practice/VideoTestRunner";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function VideoTestSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10">
      <VideoTestRunner
        sessionId={sessionId}
        resultsHref={`/practice/video-tests/${sessionId}/results`}
      />
    </div>
  );
}
