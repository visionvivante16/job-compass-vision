import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Target, TrendingUp, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { useRecommendedJobs } from "@/hooks/useRecommendedJobs";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function JobMatchesPanel() {
  const { data: jobs, isLoading, canRecommend } = useRecommendedJobs();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const { strong, good, needsSkills, allZero } = useMemo(() => {
    if (!jobs?.length) return { strong: 0, good: 0, needsSkills: 0, allZero: true };

    let s = 0, g = 0, n = 0;
    const allZero = jobs.every(j => j.matchScore === 0);

    for (const job of jobs) {
      const score = job.matchScore; // absolute 0-100
      if (score >= 70) s++;
      else if (score >= 40) g++;
      else if (score >= 20) n++;
    }

    return { strong: s, good: g, needsSkills: n, allZero };
  }, [jobs]);

  if (profileLoading || isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5 max-w-[600px]">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (!canRecommend) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border border-border/60 bg-card p-3 shadow-sm max-w-[600px]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">Job matches for you</h3>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="text-[11px] font-medium px-3 py-1 rounded-md border border-border bg-white text-black hover:bg-white/90 transition-colors"
          >
            Complete Profile
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Add skills or upload a resume to get matches.
        </p>
      </motion.div>
    );
  }

  // If all jobs scored 0 or no jobs found, show a helpful fallback
  if (allZero && jobs && jobs.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border border-border/40 bg-card p-3 shadow-sm max-w-[600px]"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">Job matches for you</h3>
          </div>
          <button
            onClick={() => navigate("/recommendations")}
            className="flex items-center gap-0.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          <span>Showing latest jobs — <button onClick={() => navigate("/profile")} className="text-primary hover:underline">complete your profile</button> for personalized matches</span>
        </div>
      </motion.div>
    );
  }

  const total = strong + good + needsSkills;
  const stats = [
    { label: "strong matches", count: strong, icon: Target, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "good matches", count: good, icon: TrendingUp, color: "text-amber-600 dark:text-amber-400" },
    { label: "needs skills", count: needsSkills, icon: AlertTriangle, color: "text-muted-foreground" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border/40 bg-card p-3 shadow-sm max-w-[600px]"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[13px] font-semibold text-foreground">Job matches for you</h3>
        </div>
        <button
          onClick={() => navigate("/recommendations")}
          className="flex items-center gap-0.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Inline stats */}
      <div className="flex items-center gap-3 text-[11px]">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <s.icon className={cn("h-3 w-3", s.color)} />
            <span className={cn("font-semibold", s.color)}>{s.count}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
