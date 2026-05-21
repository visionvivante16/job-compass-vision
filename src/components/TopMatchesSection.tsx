import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useRecommendedJobs, RecommendedJob } from "@/hooks/useRecommendedJobs";
import { useProfile } from "@/hooks/useProfile";
import { calculateJobMatch } from "@/lib/jobMatcher";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { Skeleton } from "@/components/ui/skeleton";
import { Job } from "@/types/job";
import { cn } from "@/lib/utils";

interface TopMatchesSectionProps {
  onJobTap?: (job: Job) => void;
}

export function TopMatchesSection({ onJobTap }: TopMatchesSectionProps) {
  const { data: jobs, isLoading, canRecommend } = useRecommendedJobs();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const intelligence = profile?.resume_intelligence as ResumeIntelligence | null | undefined;

  const topMatches = useMemo(() => {
    if (!jobs?.length || !intelligence) return [];
    return jobs
      .map((job) => ({
        job,
        match: calculateJobMatch(job, intelligence),
      }))
      .filter((r) => r.match.score >= 50)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 5);
  }, [jobs, intelligence]);

  const handleClick = useCallback(
    (job: RecommendedJob) => {
      onJobTap?.(job);
    },
    [onJobTap]
  );

  if (profileLoading || isLoading) {
    return (
      <div className="mb-4 rounded-xl border border-border/40 bg-card p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-48 rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!canRecommend || topMatches.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 rounded-xl border border-accent/20 bg-accent/[0.03] p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">
            Top Matches for You
          </h3>
          <Badge className="bg-accent/15 text-accent border-accent/25 text-[10px] px-1.5 py-0 rounded-full font-medium ml-1">
            {topMatches.length}
          </Badge>
        </div>
        <button
          onClick={() => navigate("/recommendations")}
          className="flex items-center gap-0.5 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {topMatches.map(({ job, match }, index) => (
          <motion.button
            key={job.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            onClick={() => handleClick(job)}
            className="shrink-0 w-52 text-left p-3 rounded-xl border border-border/40 bg-card hover:border-accent/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-2.5 mb-2">
              <CompanyLogo companyName={job.company} logoUrl={job.company_logo} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground truncate group-hover:text-accent transition-colors">
                  {job.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {job.company}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                className={cn(
                  "text-[10px] px-1.5 py-0 rounded-full font-bold border-0",
                  match.score >= 80
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : match.score >= 60
                    ? "bg-primary/15 text-primary"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}
              >
                {match.score}% Match
              </Badge>
              <span className="text-[10px] text-muted-foreground truncate">
                {match.tierLabel}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
