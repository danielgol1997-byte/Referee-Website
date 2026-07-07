"use client";

import { useState } from "react";

export default function HologramTestPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    hologramUrl: string;
    cloudinaryPublicId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!imageUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/generate-hologram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — check the console");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">
            Hologram Generator
          </h1>
          <p className="text-gray-400 mt-2">
            Paste a publicly accessible image URL (e.g. a Cloudinary URL or any
            direct image link) to generate a hologram version.
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 space-y-4 border border-gray-800">
          <label className="block text-sm font-medium text-gray-300">
            Referee Image URL
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {imageUrl && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">Input preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Input preview"
                className="h-40 w-auto rounded-lg object-cover border border-gray-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading || !imageUrl.trim()}
            className="w-full py-3 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Generating hologram… (~30–60s)
              </span>
            ) : (
              "Generate Hologram"
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-gray-900 rounded-xl p-6 border border-cyan-800 space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400">
              Hologram Generated!
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-2">Original</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Original"
                  className="rounded-lg w-full object-cover border border-gray-700"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Hologram</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.hologramUrl}
                  alt="Hologram"
                  className="rounded-lg w-full object-cover border border-cyan-700"
                />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 space-y-1">
              <p className="text-xs text-gray-400">
                Cloudinary URL (save this):
              </p>
              <p className="text-sm text-cyan-300 break-all font-mono">
                {result.hologramUrl}
              </p>
              <p className="text-xs text-gray-400 mt-2">Public ID:</p>
              <p className="text-sm text-gray-300 font-mono">
                {result.cloudinaryPublicId}
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(result.hologramUrl)}
              className="text-sm text-cyan-400 hover:text-cyan-300 underline"
            >
              Copy Cloudinary URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
