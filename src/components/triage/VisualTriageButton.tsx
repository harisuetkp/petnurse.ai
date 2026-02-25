import { useState, useRef } from "react";
import { Camera, X, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface VisualTriageButtonProps {
  onAnalysisComplete: (result: string) => void;
  isLoading?: boolean;
}

export function VisualTriageButton({ onAnalysisComplete, isLoading }: VisualTriageButtonProps) {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      setAnalyzing(true);

      try {
        // Use supabase.functions.invoke which includes proper authentication
        const { data, error } = await supabase.functions.invoke("triage", {
          body: {
            type: "visual-triage",
            image: base64,
          },
        });

        if (error) {
          console.error("Visual triage error:", error);
          if (error.message?.includes("Authentication required") || error.message?.includes("AUTH_REQUIRED")) {
            onAnalysisComplete("Please sign in to use the visual triage feature.");
          } else {
            throw error;
          }
          return;
        }

        const content = data?.choices?.[0]?.message?.content || "";
        
        onAnalysisComplete(content);
        setOpen(false);
        setPreview(null);
      } catch (error) {
        console.error("Visual triage error:", error);
        onAnalysisComplete("I couldn't analyze that image. Please try again with a clearer photo of your pet's gums or eyes.");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setAnalyzing(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        disabled={isLoading}
        className="h-12 w-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
      >
        <Camera className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md mx-5 rounded-[20px] p-0 overflow-hidden border-0">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm mb-3">
              <Eye className="h-7 w-7 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                Visual Triage
              </DialogTitle>
            </DialogHeader>
            <p className="text-white/90 mt-2 text-sm">
              Take a photo of your pet's gums or eyes for instant AI analysis
            </p>
          </div>

          <div className="p-6 space-y-4">
            {preview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-medium">Analyzing...</p>
                    </div>
                  </div>
                )}
                {!analyzing && (
                  <button
                    onClick={() => setPreview(null)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white transition-all duration-100 active:scale-[0.95]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="apple-card p-4 bg-muted/50 text-center">
                  <p className="text-sm text-foreground font-medium mb-1">📸 What to photograph:</p>
                  <p className="text-xs text-muted-foreground">
                    Gently lift your pet's lip to show their gums, or take a close-up of their eyes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="apple-card p-3 text-center bg-emergency-red/5">
                    <p className="text-xs font-semibold text-emergency-red">🚨 Emergency Signs</p>
                    <p className="text-xs text-muted-foreground mt-1">Pale/white, blue, or bright red gums</p>
                  </div>
                  <div className="apple-card p-3 text-center bg-safe-green/5">
                    <p className="text-xs font-semibold text-safe-green">✓ Healthy Signs</p>
                    <p className="text-xs text-muted-foreground mt-1">Pink, moist gums with quick refill</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-14 text-base font-semibold rounded-xl"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
