import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Job } from "@/types/job";
import { JobMatchResult } from "@/lib/jobMatcher";
import { LandingProbabilityResult } from "@/lib/landingProbability";
import { LandingProbabilityBadge } from "@/components/LandingProbabilityBadge";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MapPin, Clock, DollarSign, Bookmark, BookmarkCheck, ArrowRight, Target, FileText, Linkedin } from "lucide-react";
import { formatJobTimestamp } from "@/lib/jobTimestamp";
import { useNavigate } from "react-router-dom";
import { memo, useCallback, useState, useMemo, lazy, Suspense } from "react";
import { analyzeVisaSponsorship } from "@/lib/visaSponsorship";
import { VisaSponsorshipBadge } from "@/components/VisaSponsorshipBadge";
import { useAtsCheck } from "@/hooks/useAtsCheck";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { LinkedInConnectDialog } from "@/components/LinkedInConnectDialog";
import { hasUsableDescription, NO_DESCRIPTION_TOOLTIP } from "@/lib/jobDescriptionGate";

const AtsCheckDialog = lazy(async () => {
  const module = await import("@/components/AtsCheckDialog");
  return { default: module.AtsCheckDialog };
});

const CoverLetterDialog = lazy(async () => {
  const module = await import("@/components/CoverLetterDialog");
  return { default: module.CoverLetterDialog };
});

const TailoredResumeDialog = lazy(async () => {
  const module = await import("@/components/TailoredResumeEditor");
  return { default: module.TailoredResumeEditor };
});

interface JobCardProps {
  job: Job;
  onViewDetails?: (job: Job) => void;
  onTap?: (job: Job) => void;
  isSelected?: boolean;
  style?: React.CSSProperties;
  matchResult?: JobMatchResult;
  landingProbability?: LandingProbabilityResult | null;
  /** Controls blinking: 'dashboard' = no blink, 'recommendations' = cover letter + tailored resume blink */
  context?: 'dashboard' | 'recommendations';
}

export const JobCard = memo(function JobCard({ job, onViewDetails, onTap, isSelected, style, matchResult, landingProbability, context = 'dashboard' }: JobCardProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasResume = Boolean(profile?.resume_url);

  const saved = isSaved(job.id);
  const applied = isApplied(job.id);
  const visaResult = useMemo(() => analyzeVisaSponsorship(job), [job]);
  const aiEnabled = useMemo(() => hasUsableDescription(job), [job]);

  // ATS Check state
  const { runCheck, isChecking, result: atsResult, clearResult: clearAts } = useAtsCheck();
  const [showAtsDialog, setShowAtsDialog] = useState(false);

  // Cover Letter state
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);

  // Tailored Resume state
  const [tailoredResumeOpen, setTailoredResumeOpen] = useState(false);

  // LinkedIn Connect state
  const [linkedInOpen, setLinkedInOpen] = useState(false);

  const requireResume = (featureName: string): boolean => {
    if (hasResume) return true;
    toast({
      title: "Resume required",
      description: `Please upload your resume first to use ${featureName}.`,
      action: (
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate("/profile")}>
          Upload Resume
        </Button>
      ),
    });
    return false;
  };

  const handleAtsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    if (!requireResume("ATS Check")) return;
    runCheck({
      job_description: job.description,
      job_title: job.title,
      job_skills: job.skills,
    });
    setShowAtsDialog(true);
  };

  const handleCoverLetterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    if (!requireResume("Cover Letter")) return;
    setCoverLetterOpen(true);
  };

  const handleTailoredResumeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    if (!requireResume("Tailored Resume")) return;
    setTailoredResumeOpen(true);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    if (saved) unsaveJob(job.id);
    else saveJob(job);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    applyToJob(job);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    if (onTap) onTap(job);
  };

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (onTap) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) return;
      onTap(job);
    }
  }, [onTap, job]);

  const getLocationBadge = () => {
    const loc = job.location.toLowerCase();
    if (loc.includes("remote")) return "bg-success-bg text-success-text";
    if (loc.includes("hybrid")) return "bg-tab-selected-bg text-tab-selected-text";
    return "bg-secondary text-foreground";
  };

  return (
    <>
    <Card
      className={`group p-5 border bg-card rounded-2xl cursor-pointer overflow-visible relative transition-all duration-300 ease-out hover:-translate-y-1 ${
        isSelected
          ? "border-accent/60 ring-1 ring-accent/30 shadow-[0_0_0_1px_hsl(var(--accent)/0.2),0_8px_28px_-8px_hsl(var(--accent)/0.25)]"
          : "border-border/60 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_1px_3px_hsl(var(--foreground)/0.03)] hover:shadow-[0_10px_30px_-10px_hsl(var(--foreground)/0.12)] hover:border-border dark:hover:border-accent/30"
      }`}
      onClick={handleCardClick}
      style={style}
    >
      {/* Header Row */}
      <div className="flex items-start gap-3.5 mb-3 relative z-10">
        <CompanyLogo
          logoUrl={job.company_logo}
          companyName={job.company}
          size="md"
          className="rounded-xl shrink-0 ring-1 ring-border/30"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className="font-display font-semibold text-foreground text-base leading-tight cursor-pointer hover:text-accent transition-colors duration-200"
                onClick={handleTitleClick}
              >
                {job.title}
              </h3>
              <p className="text-accent font-semibold text-sm mt-0.5">
                {job.company?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')}
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {job.location && !/nan/i.test(job.location) && !/not specified/i.test(job.location) && job.location.length < 100
                  ? job.location.split(',')[0] 
                  : 'Location not specified'}
              </p>
            </div>
            {/* Top-right: posted time + score badges, stacked vertically */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20 whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {formatJobTimestamp(job.updated_at)}
              </span>
              {(landingProbability || (!matchResult && job.is_reviewing)) && (
                <div className="flex items-center gap-1.5">
                  {landingProbability && (
                    <LandingProbabilityBadge result={landingProbability} compact />
                  )}
                  {!matchResult && job.is_reviewing && (
                    <Badge className="shrink-0 px-2.5 py-1 text-[11px] font-medium bg-success-bg text-success-text border-0 rounded-full whitespace-nowrap animate-pulse">
                      ● Reviewing
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10">
        {visaResult.status !== "unknown" && visaResult.status !== "unlikely" && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border ${
              visaResult.status === "sponsors"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                : visaResult.status === "stem_opt"
                ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25"
                : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25"
            }`}
            title={visaResult.visaTypes.join(", ")}
          >
            {visaResult.emoji} {visaResult.label}
          </span>
        )}
        {job.location && !/nan/i.test(job.location) && !/not specified/i.test(job.location) && job.location.trim() !== '' && job.location.length < 100 && !/document\.|window\.|dispatchEvent|analytics/i.test(job.location) && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getLocationBadge()}`}>
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
        )}

        {job.salary_range && !/nan/i.test(job.salary_range) && !/none/i.test(job.salary_range) && !/not specified/i.test(job.salary_range) && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
            <DollarSign className="h-3.5 w-3.5" />
            {job.salary_range}
          </span>
        )}

        {job.employment_type && !/nan/i.test(job.employment_type) && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-medium">
            <Clock className="h-3.5 w-3.5" />
            {job.employment_type}
          </span>
        )}
      </div>

      {/* Skills - max 5 visible + N more */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
          {job.skills.slice(0, 7).map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="text-xs font-normal px-2.5 py-1 rounded-full bg-secondary/50 text-foreground border-border/40 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-200"
            >
              {skill}
            </Badge>
          ))}
          {job.skills.length > 7 && (
            <Badge variant="outline" className="text-xs font-normal px-2.5 py-1 rounded-full text-muted-foreground">
              +{job.skills.length - 7} more
            </Badge>
          )}
        </div>
      )}

      {/* AI Actions Row — hidden when job description is unavailable AND enrichment failed/pending */}
      {aiEnabled && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2 relative z-10">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium h-7 px-3 rounded-full border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/50 hover:shadow-[0_0_8px_hsl(var(--accent)/0.15)] transition-all duration-300"
            onClick={handleAtsClick}
          >
            <Target className="h-3.5 w-3.5 mr-1" />
            ATS Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`text-xs font-medium h-7 px-3 rounded-full border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/50 hover:shadow-[0_0_8px_hsl(var(--accent)/0.15)] transition-all duration-300${context === 'recommendations' ? ' animate-[ats-glow_4s_ease-in-out_infinite]' : ''}`}
            onClick={handleCoverLetterClick}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Cover Letter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`text-xs font-medium h-7 px-3 rounded-full border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/50 hover:shadow-[0_0_8px_hsl(var(--accent)/0.15)] transition-all duration-300${context === 'recommendations' ? ' animate-[ats-glow_4s_ease-in-out_infinite]' : ''}`}
            onClick={handleTailoredResumeClick}
          >
            <Target className="h-3.5 w-3.5 mr-1" />
            Tailored Resume
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/30 relative z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveClick}
            className={`h-9 px-3 text-sm font-normal gap-1.5 rounded-full transition-all duration-200 active:scale-95 ${
              saved ? "text-accent" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
        <Button
          size="sm"
          onClick={handleApplyClick}
          disabled={applied}
          className={`h-9 px-5 text-sm font-medium rounded-full gap-1.5 group/btn transition-all duration-200 active:scale-95 ${
            applied
              ? "bg-secondary text-foreground border border-border cursor-default"
              : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-glow btn-glow"
          }`}
        >
          {applied ? "Applied ✓" : (
            <>
              Apply Now
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </>
          )}
        </Button>
      </div>
    </Card>

    {/* Dialogs */}
    {showAtsDialog && (
      <Suspense fallback={null}>
        <AtsCheckDialog
          open={showAtsDialog}
          onOpenChange={(open) => { setShowAtsDialog(open); if (!open) clearAts(); }}
          result={atsResult}
          isChecking={isChecking}
        />
      </Suspense>
    )}
    {coverLetterOpen && (
      <Suspense fallback={null}>
        <CoverLetterDialog
          open={coverLetterOpen}
          onOpenChange={setCoverLetterOpen}
          job={job}
        />
      </Suspense>
    )}
    {tailoredResumeOpen && (
      <Suspense fallback={null}>
        <TailoredResumeDialog
          open={tailoredResumeOpen}
          onOpenChange={setTailoredResumeOpen}
          job={job}
        />
      </Suspense>
    )}
    {linkedInOpen && (
      <LinkedInConnectDialog
        open={linkedInOpen}
        onOpenChange={setLinkedInOpen}
        job={job}
      />
    )}
    </>
  );
});
