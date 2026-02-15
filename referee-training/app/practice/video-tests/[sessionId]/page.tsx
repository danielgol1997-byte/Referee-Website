import { VideoTestRunner } from "@/components/practice/VideoTestRunner";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function VideoTestSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  return (
    <div className="mx-auto h-[calc(100vh-4rem)] max-w-screen-xl overflow-hidden px-4 py-4 md:px-6">
      <VideoTestRunner
        sessionId={sessionId}
        resultsHref={`/practice/video-tests/${sessionId}/results`}
      />
    </div>
  );
}
