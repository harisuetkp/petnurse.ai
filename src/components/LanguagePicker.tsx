import { Language, LANGUAGES } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface LanguagePickerProps {
  onSelect: (lang: Language) => void;
}

export function LanguagePicker({ onSelect }: LanguagePickerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-background">
      <div className="max-w-sm w-full space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Choose Your Language</h1>
          <p className="text-sm text-muted-foreground">Select the language for the app</p>
        </div>
        <div className="space-y-2.5">
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              variant="outline"
              className="w-full h-14 rounded-2xl justify-start gap-4 text-base hover:bg-primary/5 hover:border-primary/30 transition-all"
              onClick={() => onSelect(lang.code)}
            >
              <span className="text-2xl">{lang.flag}</span>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-foreground text-sm">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
