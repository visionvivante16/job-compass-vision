import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { AtsCheckResult } from "@/hooks/useAtsCheck";
import {
  CheckCircle2, XCircle, TrendingUp, Lightbulb, Target, Loader2,
  Sparkles, ShieldCheck, GraduationCap, Briefcase, Zap,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AtsCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AtsCheckResult | null;
  isChecking: boolean;
  // For custom job description mode
  showCustomInput?: boolean;
  onRunCustomCheck?: (description: string) => void;
}

function getVerdictConfig(verdict: string) {
  switch (verdict) {
    case "strong_match":
      return { label: "Strong Match", color: "text-emerald-500", bg: "bg-emerald-500/10", emoji: "🎯" };
    case "good_match":
      return { label: "Good Match", color: "text-blue-500", bg: "bg-blue-500/10", emoji: "👍" };
    case "moderate_match":
      return { label: "Moderate Match", color: "text-amber-500", bg: "bg-amber-500/10", emoji: "⚡" };
    case "weak_match":
      return { label: "Needs Work", color: "text-red-500", bg: "bg-red-500/10", emoji: "🔧" };
    default:
      return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted", emoji: "❓" };
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function ScoreRing({ score, label, icon: Icon }: { score: number; label: string; icon: any }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-blue-500" : score >= 40 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-secondary/40">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export function AtsCheckDialog({
  open, onOpenChange, result, isChecking, showCustomInput, onRunCustomCheck,
}: AtsCheckDialogProps) {
  const [customDescription, setCustomDescription] = useState("");

  const handleCustomSubmit = () => {
    if (customDescription.trim() && onRunCustomCheck) {
      onRunCustomCheck(customDescription.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-b from-accent/5 to-transparent">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Target className="h-5 w-5 text-accent" />
              ATS Compatibility Check
            </DialogTitle>
            <DialogDescription>
              See how well your profile matches this position
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6">
            {/* Custom input mode */}
            {showCustomInput && !result && !isChecking && (
              <div className="space-y-4">
                <Textarea
                  placeholder="Paste a job description here to check your ATS compatibility..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="min-h-[200px] rounded-2xl resize-none"
                />
                <Button
                  onClick={handleCustomSubmit}
                  disabled={!customDescription.trim()}
                  className="w-full rounded-xl h-11"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze ATS Compatibility
                </Button>
              </div>
            )}

            {/* Loading state */}
            {isChecking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-accent" />
                  <Sparkles className="h-5 w-5 text-accent absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Analyzing your profile...</p>
                  <p className="text-sm text-muted-foreground mt-1">Comparing skills, experience & keywords</p>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {result && !isChecking && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Top score section */}
                  {(() => {
                    const verdict = getVerdictConfig(result.verdict);
                    return (
                      <div className={`text-center p-6 rounded-2xl ${verdict.bg} border border-border/30`}>
                        <span className="text-4xl mb-2 block">{verdict.emoji}</span>
                        <div className={`text-5xl font-black ${verdict.color} mb-1`}>
                          {result.overall_score}%
                        </div>
                        <Badge variant="secondary" className={`${verdict.color} font-semibold text-sm px-3 py-1`}>
                          {verdict.label}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                          {result.summary}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Score breakdown */}
                  <div className="grid grid-cols-4 gap-2">
                    <ScoreRing score={result.keyword_match_score} label="Keywords" icon={Zap} />
                    <ScoreRing score={result.skills_match_score} label="Skills" icon={ShieldCheck} />
                    <ScoreRing score={result.experience_match_score} label="Experience" icon={Briefcase} />
                    <ScoreRing score={result.education_match_score} label="Education" icon={GraduationCap} />
                  </div>

                  {/* Matched keywords */}
                  {result.matched_keywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Matched Keywords ({result.matched_keywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.matched_keywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-xs rounded-full">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing keywords */}
                  {result.missing_keywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Missing Keywords ({result.missing_keywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missing_keywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border-0 text-xs rounded-full">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {result.strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Your Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-blue-500 mt-0.5">✓</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {result.improvements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Suggestions to Improve
                      </h4>
                      <ul className="space-y-1.5">
                        {result.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-amber-500 mt-0.5">→</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Run again for custom mode */}
                  {showCustomInput && (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => { setCustomDescription(""); onOpenChange(true); }}
                    >
                      Check Another Job
                    </Button>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
