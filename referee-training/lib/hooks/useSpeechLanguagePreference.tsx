"use client";

import { useEffect, useState } from "react";

export type SpeechLanguagePreference = "auto" | string;

export interface SpeechLanguageOption {
  value: SpeechLanguagePreference;
  /** Country flag emoji; empty for Auto (globe shown via icon only). */
  flag: string;
  abbr: string;
  /** Endonym / native script — shown in dropdown. */
  labelNative: string;
}

export const SPEECH_LANGUAGE_OPTIONS: SpeechLanguageOption[] = [
  { value: "auto", flag: "", abbr: "AUTO", labelNative: "Auto-detect" },
  { value: "en-US", flag: "🇺🇸", abbr: "EN", labelNative: "English" },
  { value: "he-IL", flag: "🇮🇱", abbr: "HE", labelNative: "עברית" },
  { value: "ar-SA", flag: "🇸🇦", abbr: "AR", labelNative: "العربية" },
  { value: "es-ES", flag: "🇪🇸", abbr: "ES", labelNative: "Español" },
  { value: "fr-FR", flag: "🇫🇷", abbr: "FR", labelNative: "Français" },
  { value: "de-DE", flag: "🇩🇪", abbr: "DE", labelNative: "Deutsch" },
  { value: "pt-BR", flag: "🇧🇷", abbr: "PT", labelNative: "Português" },
  { value: "ru-RU", flag: "🇷🇺", abbr: "RU", labelNative: "Русский" },
  { value: "zh-CN", flag: "🇨🇳", abbr: "ZH", labelNative: "中文" },
];

const STORAGE_KEY = "speechInput:languagePreference";

/** Small inline globe SVG — single source for "language / auto" affordance (avoids duplicate globes). */
export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  );
}

export function useSpeechLanguagePreference() {
  const [preference, setPreference] = useState<SpeechLanguagePreference>("auto");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const isKnown = SPEECH_LANGUAGE_OPTIONS.some((opt) => opt.value === stored);
      setPreference(isKnown ? stored : "auto");
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  const updatePreference = (value: SpeechLanguagePreference) => {
    setPreference(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore localStorage errors.
    }
  };

  return { preference, setPreference: updatePreference };
}
