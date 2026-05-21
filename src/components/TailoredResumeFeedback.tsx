import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  templateUsed: string;
  jobTitle: string;
  companyName: string;
  onDismiss: () => void;
}

const NEGATIVE_OPTIONS = [
  "Not relevant enough to the job",
  "Did not match my original format",
  "Missing important keywords",
  "Too generic",
  "Wrong template style",
];

export function TailoredResumeFeedback({ templateUsed, jobTitle, companyName, onDismiss }: Props) {
  const { user } = useAuth();
  const [stage, setStage] = useState<"ask" | "negative" | "thanks">("ask");
  const [autoDismiss, setAutoDismiss] = useState(true);

  useEffect(() => {
    if (!autoDismiss) return;
    const t = setTimeout(() => onDismiss(), 5000);
    return () => clearTimeout(t);
  }, [autoDismiss, onDismiss]);

  const save = (rating: "positive" | "negative", feedback_text?: string) => {
    if (!user) return;
    supabase
      .from("feature_feedback")
      .insert({
        user_id: user.id,
        feature: "tailor_resume",
        rating: rating === "positive" ? 1 : 0,
        feedback_text: feedback_text || null,
        template_used: templateUsed,
        job_title: jobTitle,
        company_name: companyName,
        trigger_source: "tailor_resume_download",
        comment: feedback_text || null,
      } as any)
      .then(() => {});
  };

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] w-[320px] bg-card border border-border rounded-xl shadow-xl p-4 animate-in slide-in-from-bottom-4 fade-in",
      )}
      onMouseEnter={() => setAutoDismiss(false)}
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {stage === "ask" && (
        <>
          <div className="text-sm font-medium pr-4">Happy with your tailored resume?</div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                save("positive");
                setStage("thanks");
              }}
              className="flex-1 h-9 rounded-lg border border-border hover:bg-accent flex items-center justify-center gap-1.5 text-sm"
            >
              <ThumbsUp className="h-4 w-4" /> 👍
            </button>
            <button
              onClick={() => {
                setAutoDismiss(false);
                setStage("negative");
              }}
              className="flex-1 h-9 rounded-lg border border-border hover:bg-accent flex items-center justify-center gap-1.5 text-sm"
            >
              <ThumbsDown className="h-4 w-4" /> 👎
            </button>
          </div>
        </>
      )}

      {stage === "negative" && (
        <>
          <div className="text-sm font-medium">What could be better?</div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {NEGATIVE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  save("negative", opt);
                  setStage("thanks");
                }}
                className="text-[11px] px-2.5 py-1.5 rounded-full border border-border hover:border-foreground hover:bg-accent transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {stage === "thanks" && (
        <div className="text-sm">Great! Good luck with your application 🎯</div>
      )}
    </div>
  );
}
