"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type ArDecision = "OFFSIDE" | "ONSIDE";

type ArClip = {
  id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  correctAnswer: ArDecision;
  passMomentTime: number | null;
  passFrameUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  timesAnswered: number;
};

type SubTab = "upload" | "manage";

type CapturedFrame = {
  blob: Blob;
  dataUrl: string;
  time: number;
};

const MIN_BANK_SIZE = 10;

function formatSeconds(value: number) {
  return `${value.toFixed(1)}s`;
}

export function ArClipsAdminPanel() {
  const modal = useModal();
  const [subTab, setSubTab] = useState<SubTab>("manage");
  const [clips, setClips] = useState<ArClip[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ─── Form state (shared by create + edit) ───
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<ArDecision | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [existingClip, setExistingClip] = useState<ArClip | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<CapturedFrame | null>(null);
  const [previewTime, setPreviewTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStep, setSaveStep] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─── Manage state ───
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [previewClip, setPreviewClip] = useState<ArClip | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const loadClips = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/admin/ar-clips");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load clips");
      setClips(data.clips ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load clips");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const resetForm = () => {
    setEditingClipId(null);
    setTitle("");
    setDescription("");
    setCorrectAnswer(null);
    setIsActive(true);
    setVideoFile(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setVideoPreviewUrl(null);
    setExistingClip(null);
    setCapturedFrame(null);
    setFormError(null);
    setSaveStep(null);
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setFormError("Please choose a video file.");
      return;
    }
    setFormError(null);
    setVideoFile(file);
    setCapturedFrame(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setVideoPreviewUrl(url);
  };

  const nudgeVideo = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
    video.currentTime = Math.min(Math.max(video.currentTime + deltaSeconds, 0), duration);
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoPreviewUrl) return;
    video.pause();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const time = video.currentTime;
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          setCapturedFrame({
            blob,
            dataUrl: canvas.toDataURL("image/jpeg", 0.92),
            time,
          });
        },
        "image/jpeg",
        0.95
      );
    } catch {
      void modal.showError(
        "Unable to capture a frame from this video. The video source does not allow canvas capture."
      );
    }
  };

  const startEditing = (clip: ArClip) => {
    resetForm();
    setEditingClipId(clip.id);
    setExistingClip(clip);
    setTitle(clip.title);
    setDescription(clip.description ?? "");
    setCorrectAnswer(clip.correctAnswer);
    setIsActive(clip.isActive);
    setVideoPreviewUrl(clip.fileUrl);
    setSubTab("upload");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    setFormError(null);
    setSuccess(null);

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!correctAnswer) {
      setFormError("Select the correct answer: offside or onside.");
      return;
    }
    if (!editingClipId && !videoFile) {
      setFormError("Choose a video file to upload.");
      return;
    }

    const hasPassMoment = capturedFrame !== null || (editingClipId && existingClip?.passFrameUrl);
    if (!hasPassMoment) {
      const proceed = await modal.showConfirm(
        "No pass moment captured. Save anyway?",
        "No pass moment",
        "warning"
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      let uploadedVideo: { url: string; thumbnailUrl?: string | null; duration?: number | null } | null = null;

      if (videoFile) {
        setSaveStep("Uploading video…");
        const formData = new FormData();
        formData.append("video", videoFile);
        const res = await fetch("/api/admin/ar-clips/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Video upload failed");
        uploadedVideo = data.video;
      }

      let frameUrl: string | null = null;
      if (capturedFrame) {
        setSaveStep("Uploading pass-moment frame…");
        const frameData = new FormData();
        frameData.append("frame", new File([capturedFrame.blob], "pass-frame.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/admin/ar-clips/upload/frame", { method: "POST", body: frameData });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Frame upload failed");
        frameUrl = data.frameUrl;
      }

      setSaveStep("Saving clip…");
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        correctAnswer,
        isActive,
      };
      if (uploadedVideo) {
        payload.fileUrl = uploadedVideo.url;
        payload.thumbnailUrl = uploadedVideo.thumbnailUrl ?? null;
        if (typeof uploadedVideo.duration === "number") payload.duration = uploadedVideo.duration;
      }
      if (capturedFrame) {
        payload.passFrameUrl = frameUrl;
        payload.passMomentTime = capturedFrame.time;
      }

      const res = await fetch(
        editingClipId ? `/api/admin/ar-clips/${editingClipId}` : "/api/admin/ar-clips",
        {
          method: editingClipId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save clip");

      setSuccess(editingClipId ? "Clip updated." : "Clip uploaded.");
      resetForm();
      await loadClips();
      setSubTab("manage");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save clip");
    } finally {
      setSaving(false);
      setSaveStep(null);
    }
  };

  const handleToggleActive = async (clip: ArClip) => {
    setTogglingId(clip.id);
    try {
      const res = await fetch(`/api/admin/ar-clips/${clip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !clip.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update clip");
      setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, isActive: !clip.isActive } : c)));
    } catch (err) {
      void modal.showError(err instanceof Error ? err.message : "Failed to update clip");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (clip: ArClip) => {
    const confirmed = await modal.showConfirm(
      `Delete "${clip.title}"? This can't be undone.`,
      "Delete clip",
      "warning"
    );
    if (!confirmed) return;
    setDeletingId(clip.id);
    try {
      const res = await fetch(`/api/admin/ar-clips/${clip.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete clip");
      setClips((prev) => prev.filter((c) => c.id !== clip.id));
    } catch (err) {
      void modal.showError(err instanceof Error ? err.message : "Failed to delete clip");
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = clips.filter((c) => c.isActive).length;
  const existingFrameUrl = !capturedFrame && editingClipId ? existingClip?.passFrameUrl ?? null : null;
  const existingFrameTime = !capturedFrame && editingClipId ? existingClip?.passMomentTime ?? null : null;

  return (
    <div className="space-y-6">
      {/* ─── Sub-tab navigation (matches Video Library admin) ─── */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab("manage")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all",
            subTab === "manage"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          )}
        >
          Clips ({clips.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("upload")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all",
            subTab === "upload"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          )}
        >
          {editingClipId ? "Edit Clip" : "Upload Clip"}
        </button>
      </div>

      {/* ─── Bank size warning ─── */}
      {!listLoading && activeCount < MIN_BANK_SIZE && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-400">
            {activeCount}/{MIN_BANK_SIZE} active clips — upload {MIN_BANK_SIZE - activeCount} more for a full test bank.
          </p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-[#22c55e]">{success}</p>
          <button type="button" onClick={() => setSuccess(null)} className="text-xs text-text-muted hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* ═══ Upload / Edit form ═══ */}
      {subTab === "upload" && (
        <div className="space-y-5 rounded-xl border border-dark-600 bg-dark-800/70 p-5 md:p-6">
          {editingClipId && (
            <div className="flex items-center justify-between rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5">
              <p className="text-sm text-cyan-300">
                Editing: <span className="font-semibold">{existingClip?.title}</span>
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-text-secondary hover:text-white"
              >
                Cancel edit
              </button>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clip title"
            />
          </div>

          {/* Video file */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">
              Video {editingClipId && <span className="font-normal text-text-muted">(optional — replaces current)</span>}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-dark-900 hover:file:bg-accent/90"
            />
          </div>

          {/* Preview + pass moment capture */}
          {videoPreviewUrl && (
            <div className="space-y-3 rounded-lg border border-dark-600 bg-dark-900/60 p-4">
              <p className="text-sm font-semibold text-white">
                Pass moment
                <span className="ml-2 font-normal text-text-muted">
                  Pause on the frame where the ball is played, then capture.
                </span>
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-lg border border-dark-600 bg-black">
                    <video
                      ref={videoRef}
                      key={videoPreviewUrl}
                      src={videoPreviewUrl}
                      controls
                      playsInline
                      preload="auto"
                      crossOrigin="anonymous"
                      onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                      onSeeked={(e) => setPreviewTime(e.currentTarget.currentTime)}
                      onPause={(e) => setPreviewTime(e.currentTarget.currentTime)}
                      className="h-64 w-full object-contain"
                    />
                  </div>
                  {/* Frame-step controls */}
                  <div className="flex items-center justify-center gap-1.5">
                    {[-1, -0.04, 0.04, 1].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => nudgeVideo(step)}
                        className="rounded-lg border border-dark-600 bg-dark-800 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-text-secondary transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                        title={Math.abs(step) < 0.1 ? "One frame" : "One second"}
                      >
                        {step < 0 ? "−" : "+"}{Math.abs(step) < 0.1 ? "1f" : "1s"}
                      </button>
                    ))}
                    <span className="ml-2 rounded-lg border border-dark-600 bg-dark-800 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-white">
                      {formatSeconds(previewTime)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleCaptureFrame}
                    className={cn(
                      "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                      "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20"
                    )}
                  >
                    Capture frame
                  </button>
                  {capturedFrame ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        Captured at {formatSeconds(capturedFrame.time)}
                      </p>
                      <div className="overflow-hidden rounded-lg border border-cyan-500/40 bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={capturedFrame.dataUrl} alt="Captured pass moment" className="h-44 w-full object-contain" />
                      </div>
                    </div>
                  ) : existingFrameUrl ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Current frame
                        {typeof existingFrameTime === "number" && ` (${formatSeconds(existingFrameTime)})`}
                      </p>
                      <div className="overflow-hidden rounded-lg border border-dark-600 bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={existingFrameUrl} alt="Current pass moment" className="h-44 w-full object-contain" />
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-dark-500 px-4 py-6 text-center text-xs text-text-muted">
                      No frame captured yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Correct answer */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">Correct answer</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCorrectAnswer("OFFSIDE")}
                className={cn(
                  "flex-1 rounded-xl border-2 px-6 py-3 text-base font-black uppercase tracking-wider transition-all duration-150",
                  correctAnswer === "OFFSIDE"
                    ? "border-[#ef4444] bg-[#ef4444]/25 text-[#ef4444] shadow-lg shadow-[#ef4444]/20"
                    : "border-dark-600 bg-dark-900/60 text-text-secondary hover:border-[#ef4444]/50 hover:text-[#ef4444]"
                )}
              >
                Offside
              </button>
              <button
                type="button"
                onClick={() => setCorrectAnswer("ONSIDE")}
                className={cn(
                  "flex-1 rounded-xl border-2 px-6 py-3 text-base font-black uppercase tracking-wider transition-all duration-150",
                  correctAnswer === "ONSIDE"
                    ? "border-[#22c55e] bg-[#22c55e]/25 text-[#22c55e] shadow-lg shadow-[#22c55e]/20"
                    : "border-dark-600 bg-dark-900/60 text-text-secondary hover:border-[#22c55e]/50 hover:text-[#22c55e]"
                )}
              >
                Onside
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">
              Notes <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-dark-600 bg-dark-900/60 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            <span className="text-sm text-text-secondary">Active</span>
          </label>

          {formError && (
            <div className="rounded-lg bg-status-dangerBg border border-status-danger/30 px-4 py-2.5">
              <p className="text-sm text-status-danger">{formError}</p>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-dark-600 pt-4">
            <Button onClick={handleSave} disabled={saving} className="min-w-[160px]">
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-dark-900/30 border-t-dark-900" />
                  {saveStep ?? "Saving…"}
                </span>
              ) : editingClipId ? (
                "Save changes"
              ) : (
                "Upload clip"
              )}
            </Button>
            {editingClipId && (
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Manage list ═══ */}
      {subTab === "manage" && (
        <div className="space-y-4">
          {listLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : listError ? (
            <div className="rounded-lg bg-status-dangerBg border border-status-danger/30 px-4 py-3">
              <p className="text-sm text-status-danger">{listError}</p>
            </div>
          ) : clips.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">
              No clips yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-dark-800/70 transition-all duration-200",
                    clip.isActive ? "border-dark-600" : "border-dark-600 opacity-60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewClip(clip)}
                    className="group relative block h-40 w-full bg-black"
                    title="Preview clip"
                  >
                    {clip.thumbnailUrl || clip.passFrameUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={clip.thumbnailUrl ?? clip.passFrameUrl ?? ""}
                        alt={clip.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-text-muted text-xs">No thumbnail</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="rounded-full border border-white/50 bg-black/60 p-3">
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "absolute left-2 top-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                        clip.correctAnswer === "OFFSIDE"
                          ? "border-[#ef4444]/60 bg-[#ef4444]/20 text-[#ef4444]"
                          : "border-[#22c55e]/60 bg-[#22c55e]/20 text-[#22c55e]"
                      )}
                    >
                      {clip.correctAnswer === "OFFSIDE" ? "Offside" : "Onside"}
                    </span>
                    {!clip.isActive && (
                      <span className="absolute right-2 top-2 rounded-full border border-dark-500 bg-dark-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        Hidden
                      </span>
                    )}
                    {!clip.passFrameUrl && (
                      <span className="absolute bottom-2 left-2 rounded-full border border-amber-500/60 bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        No pass frame
                      </span>
                    )}
                  </button>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="truncate text-sm font-semibold text-white" title={clip.title}>
                        {clip.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {clip.duration ? `${Math.round(clip.duration)}s · ` : ""}
                        Answered {clip.timesAnswered} time{clip.timesAnswered === 1 ? "" : "s"} ·{" "}
                        {new Date(clip.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(clip)}
                        className="flex-1 rounded-lg border border-dark-600 bg-dark-900/60 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={togglingId === clip.id}
                        onClick={() => handleToggleActive(clip)}
                        className="flex-1 rounded-lg border border-dark-600 bg-dark-900/60 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
                      >
                        {togglingId === clip.id ? "…" : clip.isActive ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === clip.id}
                        onClick={() => handleDelete(clip)}
                        className="rounded-lg border border-dark-600 bg-dark-900/60 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-[#ef4444]/50 hover:text-[#ef4444] disabled:opacity-50"
                      >
                        {deletingId === clip.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Preview modal ─── */}
      {previewClip && (
        <>
          <div className="fixed inset-0 z-[100100] bg-black/50 backdrop-blur-sm" onClick={() => setPreviewClip(null)} />
          <div
            className="fixed inset-0 z-[100110] flex items-center justify-center px-4"
            onClick={() => setPreviewClip(null)}
          >
            <div
              className="w-full max-w-3xl overflow-hidden rounded-xl border border-dark-600 bg-dark-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-dark-600 px-5 py-3">
                <p className="truncate text-sm font-semibold text-white">{previewClip.title}</p>
                <button
                  type="button"
                  onClick={() => setPreviewClip(null)}
                  className="rounded-lg border border-dark-600 px-3 py-1 text-xs font-semibold text-text-secondary hover:text-white"
                >
                  Close
                </button>
              </div>
              <video
                src={previewClip.fileUrl}
                poster={previewClip.thumbnailUrl ?? undefined}
                controls
                autoPlay
                muted
                playsInline
                className="max-h-[60dvh] w-full bg-black object-contain"
              />
              {previewClip.passFrameUrl && (
                <div className="border-t border-dark-600 px-5 py-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-cyan-300">
                    Pass moment
                    {typeof previewClip.passMomentTime === "number" && ` (${formatSeconds(previewClip.passMomentTime)})`}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewClip.passFrameUrl}
                    alt="Pass moment"
                    className="max-h-48 w-full rounded-lg border border-dark-600 bg-black object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
