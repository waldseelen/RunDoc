"use client";

import { useState, useEffect, useCallback } from "react";
import { TRANSLATIONS, type Language } from "@/lib/i18n";

export type Theme = "dark" | "light";

export function useAppSettings() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("tr");
  const [mounted, setMounted] = useState(false);

  // Initialize values safely after mounting (avoids SSR mismatches)
  useEffect(() => {
    // 1. Detect & Apply Language
    const storedLang = localStorage.getItem("rundoc-language") as Language | null;
    if (storedLang === "tr" || storedLang === "en") {
      setLanguage(storedLang);
    } else {
      const browserLang = typeof navigator !== "undefined" && navigator.language.startsWith("tr") ? "tr" : "en";
      setLanguage(browserLang);
      localStorage.setItem("rundoc-language", browserLang);
    }

    // 2. Detect & Apply Theme
    const storedTheme = localStorage.getItem("rundoc-theme") as Theme | null;
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
      const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      applyTheme(initialTheme);
      localStorage.setItem("rundoc-theme", initialTheme);
    }

    setMounted(true);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (newTheme === "light") {
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
    } else {
      root.classList.remove("light");
      root.removeAttribute("data-theme");
    }
  };

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem("rundoc-theme", nextTheme);
  }, [theme]);

  const toggleLanguage = useCallback(() => {
    const nextLang = language === "tr" ? "en" : "tr";
    setLanguage(nextLang);
    localStorage.setItem("rundoc-language", nextLang);
  }, [language]);

  const t = useCallback((key: keyof typeof TRANSLATIONS.tr): string => {
    const translations = TRANSLATIONS[language] || TRANSLATIONS.tr;
    return translations[key] || TRANSLATIONS.tr[key] || String(key);
  }, [language]);

  return {
    theme,
    language,
    toggleTheme,
    toggleLanguage,
    t,
    mounted
  };
}
