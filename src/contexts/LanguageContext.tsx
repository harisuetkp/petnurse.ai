import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Language, LANGUAGES, getTranslation } from "@/i18n/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  hasSelectedLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "petnurse-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Language) || "en";
  });

  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(
    () => !!localStorage.getItem(STORAGE_KEY)
  );

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setHasSelectedLanguage(true);
    localStorage.setItem(STORAGE_KEY, lang);
    const langConfig = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.dir = langConfig?.dir || "ltr";
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    const langConfig = LANGUAGES.find((l) => l.code === language);
    document.documentElement.dir = langConfig?.dir || "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      getTranslation(language, key, params),
    [language]
  );

  const isRTL = LANGUAGES.find((l) => l.code === language)?.dir === "rtl";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, hasSelectedLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
