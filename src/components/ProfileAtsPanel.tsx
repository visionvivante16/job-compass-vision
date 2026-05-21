import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAtsCheck, AtsCheckResult } from "@/hooks/useAtsCheck";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import {
  Target, Loader2, Sparkles, CheckCircle2, XCircle, TrendingUp,
  Lightbulb, Zap, ShieldCheck, Briefcase, GraduationCap, FileSearch, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getVerdictConfig(verdict: string) {
  switch (verdict) {
    case "strong_match":
      return { label: "Strong Match", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", emoji: "🎯", ring: "stroke-emerald-500" };
    case "good_match":
      return { label: "Good Match", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", emoji: "👍", ring: "stroke-blue-500" };
    case "moderate_match":
      return { label: "Moderate Match", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", emoji: "⚡", ring: "stroke-amber-500" };
    case "weak_match":
      return { label: "Needs Work", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", emoji: "🔧", ring: "stroke-red-500" };
    default:
      return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted", emoji: "❓", ring: "stroke-muted-foreground" };
  }
}

function ScoreRing({ score, label, icon: Icon }: { score: number; label: string; icon: any }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-blue-500" : score >= 40 ? "text-amber-500" : "text-red-500";
  const strokeColor = score >= 80 ? "stroke-emerald-500" : score >= 60 ? "stroke-blue-500" : score >= 40 ? "stroke-amber-500" : "stroke-red-500";
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" className="stroke-border" strokeWidth="3" />
          <motion.circle
            cx="32" cy="32" r="28" fill="none"
            className={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
    </div>
  );
}

interface ProfileAtsPanelProps {
  /** Current form data to use instead of saved DB profile */
  formProfile?: {
    skills?: string[] | null;
    experience_years?: number | null;
    current_title?: string | null;
    current_company?: string | null;
    work_experience?: any[] | null;
    education?: any[] | null;
    certifications?: any[] | null;
  };
}

export function ProfileAtsPanel({ formProfile }: ProfileAtsPanelProps = {}) {
  const { runCheck, isChecking, result, clearResult } = useAtsCheck();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [customDescription, setCustomDescription] = useState("");
  const hasResume = Boolean(profile?.resume_url);

  const handleSubmit = () => {
    if (customDescription.trim()) {
      runCheck({ job_description: customDescription.trim(), formProfile });
    }
  };

  const handleReset = () => {
    clearResult();
    setCustomDescription("");
  };

  return (
    <div className="space-y-4">
      {/* Input card */}
      <Card className="rounded-3xl border-primary/20 bg-primary/5 sticky top-4">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">ATS Report</CardTitle>
          </div>
          <CardDescription>
            Paste a job description to get a full resume compatibility analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasResume ? (
            <div className="text-center py-6 space-y-3">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Upload your resume first to run an ATS compatibility check.</p>
              <Button onClick={() => { const el = document.getElementById("resume-upload-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); }} variant="outline" className="rounded-xl">
                Upload Resume
              </Button>
            </div>
          ) : (!result || isChecking) ? (
            <>
              <Textarea
                placeholder="Paste job description here..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="min-h-[120px] rounded-2xl resize-none text-sm"
                disabled={isChecking}
              />
              <Button
                onClick={handleSubmit}
                disabled={!customDescription.trim() || isChecking}
                className="w-full rounded-xl h-10"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run ATS Check
                  </>
                )}
              </Button>
            </>
          ) : null}

          {/* Loading animation */}
          {isChecking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground">Comparing skills, experience & keywords</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && !isChecking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Overall score */}
            {(() => {
              const verdict = getVerdictConfig(result.verdict);
              return (
                <Card className={`rounded-3xl border ${verdict.bg}`}>
                  <CardContent className="pt-6 pb-5 text-center">
                    <span className="text-3xl mb-1 block">{verdict.emoji}</span>
                    <div className={`text-4xl font-black ${verdict.color} mb-1`}>
                      {result.overall_score}%
                    </div>
                    <Badge variant="secondary" className={`${verdict.color} font-semibold text-xs px-2.5 py-0.5`}>
                      {verdict.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      {result.summary}
                    </p>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Score breakdown */}
            <Card className="rounded-3xl">
              <CardContent className="pt-5 pb-4">
                <div className="grid grid-cols-4 gap-1">
                  <ScoreRing score={result.keyword_match_score} label="Keywords" icon={Zap} />
                  <ScoreRing score={result.skills_match_score} label="Skills" icon={ShieldCheck} />
                  <ScoreRing score={result.experience_match_score} label="Experience" icon={Briefcase} />
                  <ScoreRing score={result.education_match_score} label="Education" icon={GraduationCap} />
                </div>
              </CardContent>
            </Card>

            {/* Keywords */}
            {(result.matched_keywords.length > 0 || result.missing_keywords.length > 0) && (
              <Card className="rounded-3xl">
                <CardContent className="pt-5 pb-4 space-y-4">
                  {result.missing_keywords.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        Recommended Skills ({result.missing_keywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {result.missing_keywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border-0 text-[10px] rounded-full px-2 py-0.5">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.matched_keywords.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Strong Skills ({result.matched_keywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {result.matched_keywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] rounded-full px-2 py-0.5">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <Card className="rounded-3xl">
                <CardContent className="pt-5 pb-4">
                  <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-1.5">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <span className="text-blue-500 mt-0.5 shrink-0">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Improvements */}
            {result.improvements.length > 0 && (
              <Card className="rounded-3xl">
                <CardContent className="pt-5 pb-4">
                  <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Suggestions to Improve
                  </h4>
                  <ul className="space-y-1.5">
                    {result.improvements.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Check another */}
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={handleReset}
            >
              <FileSearch className="h-4 w-4 mr-2" />
              Check Another Job
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
