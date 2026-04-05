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

const LAST_SPEECH_LANG_STORAGE_KEY = "speechInput:lastLang";

/**
 * Detects the dominant script in a string and returns the best BCP-47 language
 * tag for the Web Speech API.
 *
 * Order of detection:
 * 1) Script in current text (best signal) and persist it
 * 2) Last successful/detected language from storage
 * 3) HTML document language
 * 4) Browser language preference list (navigator.languages)
 * 5) navigator.language fallback
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

// Maps BCP-47 base language codes to full speech-API codes.
// Does NOT include English intentionally — we skip English entries so that
// users with a mixed list like ["en-US", "he-IL"] get Hebrew.
const LANG_CODE_MAP: Record<string, string> = {
  he: "he-IL",
  iw: "he-IL",
  ar: "ar-SA",
  ru: "ru-RU",
  uk: "uk-UA",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN",
  th: "th-TH",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  pt: "pt-BR",
  it: "it-IT",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
};

// Timezone fallback for brand-new users with no typed text, no stored speech
// lang, and English-only browser language prefs.
const TIMEZONE_LANG_MAP: Array<{ prefix: string; lang: string }> = [
  { prefix: "Asia/Jerusalem", lang: "he-IL" },
  { prefix: "Asia/Tel_Aviv", lang: "he-IL" },
  { prefix: "Asia/Riyadh", lang: "ar-SA" },
  { prefix: "Asia/Dubai", lang: "ar-SA" },
  { prefix: "Asia/Amman", lang: "ar-SA" },
  { prefix: "Asia/Baghdad", lang: "ar-SA" },
  { prefix: "Europe/Moscow", lang: "ru-RU" },
  { prefix: "Asia/Shanghai", lang: "zh-CN" },
  { prefix: "Asia/Hong_Kong", lang: "zh-CN" },
  { prefix: "Asia/Taipei", lang: "zh-CN" },
  { prefix: "Asia/Tokyo", lang: "ja-JP" },
  { prefix: "Asia/Seoul", lang: "ko-KR" },
];

export function detectInputLanguage(text: string): string | undefined {
  if (typeof navigator === "undefined") return undefined;

  // 1. Script detection — most reliable when text is present
  if (text && text.trim().length >= 1) {
    for (const { pattern, lang } of SCRIPT_LANGS) {
      if (pattern.test(text)) {
        try {
          localStorage.setItem(LAST_SPEECH_LANG_STORAGE_KEY, lang);
        } catch {
          // Ignore storage failures.
        }
        return lang;
      }
    }
  }

  // 2. Last known language from previous usage/session
  try {
    const lastLang = localStorage.getItem(LAST_SPEECH_LANG_STORAGE_KEY);
    if (lastLang) return lastLang;
  } catch {
    // Ignore storage failures.
  }

  // 3. HTML document language (if configured)
  if (typeof document !== "undefined") {
    const docLang = document.documentElement.lang;
    if (docLang) {
      const docBase = docLang.split("-")[0].toLowerCase();
      if (LANG_CODE_MAP[docBase]) return LANG_CODE_MAP[docBase];
    }
  }

  // 4. Walk the browser's ordered language preference list.
  //    Skip English entries so a user with ["en-US", "he-IL"] gets Hebrew.
  const preferred: readonly string[] =
    navigator.languages?.length ? navigator.languages : [navigator.language || "en-US"];

  for (const pref of preferred) {
    const base = pref.split("-")[0].toLowerCase();
    if (LANG_CODE_MAP[base]) {
      const resolved = LANG_CODE_MAP[base];
      try {
        localStorage.setItem(LAST_SPEECH_LANG_STORAGE_KEY, resolved);
      } catch {
        // Ignore storage failures.
      }
      return resolved;
    }
    // If we hit a pure-English entry, keep looking (don't return early)
    // If the entire list is English, the loop ends and we fall through.
  }

  // 5. Timezone hint fallback (useful for first-use non-English voice)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzMatch = TIMEZONE_LANG_MAP.find((m) => tz.startsWith(m.prefix));
    if (tzMatch) {
      localStorage.setItem(LAST_SPEECH_LANG_STORAGE_KEY, tzMatch.lang);
      return tzMatch.lang;
    }
  } catch {
    // Ignore timezone detection failures.
  }

  // 6) No strong signal: return undefined and let browser choose default.
  return undefined;
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
    if (lang) {
      recognition.lang = lang;
    }
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
