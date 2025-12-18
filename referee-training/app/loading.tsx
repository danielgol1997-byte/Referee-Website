import Image from "next/image";

export default function Loading() {
  // Global route transition/loading UI.
  // This ensures navigation never "hangs" on the previous page with no feedback.
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-text-secondary">
        <Image
          src="/logo/whistle-chrome-liquid.gif"
          alt="Loading"
          width={96}
          height={96}
          className="h-24 w-24 object-contain"
          unoptimized
          priority
        />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}

