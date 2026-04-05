"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type SpeechStatus = "idle" | "listening" | "processing" | "unsupported";

interface UseSpeechInputOptions {
  /**
   * Language hint for recognition. "he-IL" for Hebrew, "en-US" for English, etc.
   * If not provided, the browser uses the system language.
   */
  lang?: string;
  /** Called with the final transcript text each time a phrase is recognized */
  onResult: (text: string) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /**
   * If true, each result appends to the previous text (admin mode - describe freely).
   * If false, each result replaces the current text (search mode - one shot query).
   */
  append?: boolean;
}

/**
 * Detects the dominant script in a string and returns the best BCP-47 language
 * tag for the Web Speech API.  Falls back to navigator.language (or "en-US")
 * when the text is empty or uses only Latin characters.
 *
 * This lets the mic automatically follow whatever language the user is typing in —
 * no manual language selection needed.
 */
const SCRIPT_LANGS: Array<{ pattern: RegExp; lang: string }> = [
  { pattern: /[\u0590-\u05FF]/, lang: "he-IL" },   // Hebrew
  { pattern: /[\u0600-\u06FF]/, lang: "ar-SA" },   // Arabic
  { pattern: /[\u0400-\u04FF]/, lang: "ru-RU" },   // Cyrillic
  { pattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/, lang: "zh-CN" }, // CJK
  { pattern: /[\u3040-\u30FF]/, lang: "ja-JP" },   // Hiragana/Katakana
  { pattern: /[\uAC00-\uD7AF]/, lang: "ko-KR" },   // Korean
  { pattern: /[\u0900-\u097F]/, lang: "hi-IN" },   // Devanagari
  { pattern: /[\u0E00-\u0E7F]/, lang: "th-TH" },   // Thai
];

export function detectInputLanguage(text: string): string {
  const browserLang =
    (typeof navigator !== "undefined" ? navigator.language : null) || "en-US";
  if (!text || text.trim().length < 2) return browserLang;
  for (const { pattern, lang } of SCRIPT_LANGS) {
    if (pattern.test(text)) return lang;
  }
  return browserLang;
}

export function useSpeechInput({
  lang,
  onResult,
  onError,
  append = false,
}: UseSpeechInputOptions) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const recognitionRef = useRef<any>(null);
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setStatus("unsupported");
      onError?.("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = lang || navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // In append mode keep listening for multiple phrases; in replace mode stop after first result
    recognition.continuous = append;

    recognition.onstart = () => setStatus("listening");

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(" ")
        .trim();
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      const msg =
        event.error === "not-allowed"
          ? "Microphone permission denied. Allow microphone access in your browser."
          : event.error === "no-speech"
          ? "No speech detected. Try again."
          : `Speech recognition error: ${event.error}`;
      onError?.(msg);
      setStatus("idle");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setStatus("idle");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, onResult, onError, append]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setStatus("idle");
  }, []);

  const toggle = useCallback(() => {
    if (status === "listening") {
      stop();
    } else {
      start();
    }
  }, [status, start, stop]);

  return { status, isSupported, start, stop, toggle };
}
