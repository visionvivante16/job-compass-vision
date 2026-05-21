import { useState } from "react";
import { ResumeTip, useResumeTips } from "@/hooks/useResumeTips";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { Job } from "@/types/job";
import { ChevronDown, ChevronUp, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface SmartResumeTipsProps {
  job: Job;
  intelligence: ResumeIntelligence | null | undefined;
}

export function SmartResumeTips({ job, intelligence }: SmartResumeTipsProps) {
  const [expanded, setExpanded] = useState(false);
  const { tips, isLoading, fetchTips, clearTips } = useResumeTips();

  if (!intelligence) return null;

  const handleToggle = () => {
    if (!expanded && !tips) {
      // Fetch tips on first expand
      fetchTips({
        job_title: job.title,
        job_description: job.description,
        job_skills: job.skills,
        resume_intelligence: intelligence,
      });
    }
    setExpanded(!expanded);
  };

  return (
    <div className="border border-border/40 rounded-xl bg-secondary/20 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">How to Improve Your Chances</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">AI</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing job description...</span>
                </div>
              ) : tips && tips.length > 0 ? (
                tips.map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-card/60 border border-border/30"
                  >
                    <span className="text-warning shrink-0 mt-0.5">💡</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">{tip.tip}</p>
                      {tip.keyword && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Keyword: <span className="font-medium text-accent">{tip.keyword}</span>
                          {tip.occurrences ? ` — appears ${tip.occurrences}x in JD` : ""}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">No tips available for this job.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
