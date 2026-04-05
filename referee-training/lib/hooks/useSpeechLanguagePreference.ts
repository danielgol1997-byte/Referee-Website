"use client";

import { useEffect, useState } from "react";

export type SpeechLanguagePreference = "auto" | string;

export interface SpeechLanguageOption {
  value: SpeechLanguagePreference;
  flag: string;
  abbr: string;
  label: string;
}

export const SPEECH_LANGUAGE_OPTIONS: SpeechLanguageOption[] = [
  { value: "auto", flag: "🌐", abbr: "AUTO", label: "Auto detect" },
  { value: "en-US", flag: "🇺🇸", abbr: "EN", label: "English (US)" },
  { value: "he-IL", flag: "🇮🇱", abbr: "HE", label: "Hebrew" },
  { value: "ar-SA", flag: "🇸🇦", abbr: "AR", label: "Arabic" },
  { value: "es-ES", flag: "🇪🇸", abbr: "ES", label: "Spanish" },
  { value: "fr-FR", flag: "🇫🇷", abbr: "FR", label: "French" },
  { value: "de-DE", flag: "🇩🇪", abbr: "DE", label: "German" },
  { value: "pt-BR", flag: "🇧🇷", abbr: "PT", label: "Portuguese" },
  { value: "ru-RU", flag: "🇷🇺", abbr: "RU", label: "Russian" },
  { value: "zh-CN", flag: "🇨🇳", abbr: "ZH", label: "Chinese" },
];

const STORAGE_KEY = "speechInput:languagePreference";

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

