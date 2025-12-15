import Link from "next/link";
import { StudyViewer } from "@/components/study/study-viewer";

export default function StudyModePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/laws"
            className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-white">Study Mode</h1>
      </div>

      {/* Study Viewer */}
      <StudyViewer />
    </div>
  );
}

