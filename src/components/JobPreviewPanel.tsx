import { useState } from "react";
import { Job } from "@/types/job";
import { JobMatchResult } from "@/lib/jobMatcher";
import { LandingProbabilityResult } from "@/lib/landingProbability";
import { LandingProbabilityPanel } from "@/components/LandingProbabilityPanel";
import { SmartResumeTips } from "@/components/SmartResumeTips";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useAtsCheck } from "@/hooks/useAtsCheck";
import { useInterviewPrep } from "@/hooks/useInterviewPrep";
import { AtsCheckDialog } from "@/components/AtsCheckDialog";
import { InterviewPrepDialog } from "@/components/InterviewPrepDialog";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Clock, DollarSign, Briefcase, Bookmark, BookmarkCheck, ExternalLink, BriefcaseBusiness, Target, Brain } from "lucide-react";
import { formatJobTimestamp } from "@/lib/jobTimestamp";
import { useNavigate } from "react-router-dom";
import { analyzeVisaSponsorship } from "@/lib/visaSponsorship";
import { VisaSponsorshipBadge } from "@/components/VisaSponsorshipBadge";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { hasUsableDescription } from "@/lib/jobDescriptionGate";


interface JobPreviewPanelProps {
  job: Job;
  matchResult?: JobMatchResult;
  landingProbability?: LandingProbabilityResult | null;
}

export function JobPreviewPanel({ job, matchResult, landingProbability }: JobPreviewPanelProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { runCheck, isChecking, result, clearResult } = useAtsCheck();
  const { prep, isLoading: isPrepLoading, generatePrep, clearPrep } = useInterviewPrep();
  const [showAtsDialog, setShowAtsDialog] = useState(false);
  const [showPrepDialog, setShowPrepDialog] = useState(false);
  

  const saved = isSaved(job.id);
  const applied = isApplied(job.id);

  const handleSaveClick = () => {
    if (!user) { navigate("/auth"); return; }
    if (saved) unsaveJob(job.id); else saveJob(job);
  };

  const handleApplyClick = () => {
    if (!user) { navigate("/auth"); return; }
    applyToJob(job);
  };

  const handleTitleClick = () => {
    // Title click should not trigger external apply; it's a no-op in the preview panel
  };

  const hasResume = Boolean(profile?.resume_url);
  const aiEnabled = hasUsableDescription(job);

  const handleAtsCheck = () => {
    if (!user) { navigate("/auth"); return; }
    if (!hasResume) {
      navigate("/profile");
      return;
    }
    clearResult();
    setShowAtsDialog(true);
    runCheck({
      job_description: job.description,
      job_title: job.title,
      job_skills: job.skills,
    });
  };

  const handleInterviewPrep = () => {
    if (!user) { navigate("/auth"); return; }
    clearPrep();
    setShowPrepDialog(true);
    generatePrep({
      job_title: job.title,
      job_description: job.description,
      job_skills: job.skills,
      resume_intelligence: profile?.resume_intelligence as ResumeIntelligence | null,
    });
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border/50 shrink-0 bg-card/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-start gap-4 mb-3">
          <CompanyLogo
            logoUrl={job.company_logo}
            companyName={job.company}
            size="lg"
            className="rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <h3
              className="font-display font-bold text-foreground text-lg leading-tight line-clamp-2 cursor-pointer hover:text-accent transition-colors"
              onClick={handleTitleClick}
            >
              {job.title}
            </h3>
            <p className="text-accent text-sm font-semibold mt-0.5">{job.company?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Updated {formatJobTimestamp(job.updated_at)}
            </p>
          </div>
          {/* Match tier label only (percentage hidden — shown in Landing Probability panel below) */}
          {matchResult && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${matchResult.tierColor}`}>
                {matchResult.tierLabel}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons - sticky with header */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApplyClick}
            className={`h-9 text-sm font-medium rounded-xl transition-all active:scale-95 ${
              applied
                ? "bg-secondary text-secondary-foreground px-5"
                : "bg-accent hover:bg-accent/90 text-accent-foreground px-6 shadow-sm"
            }`}
          >
            {applied ? "Applied" : (
              <><ExternalLink className="h-4 w-4 mr-1.5" />Apply</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveClick}
            className={`h-9 px-4 text-sm font-medium rounded-xl active:scale-95 ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          >
            {saved ? (
              <><BookmarkCheck className="h-4 w-4 mr-1.5" />Saved</>
            ) : (
              <><Bookmark className="h-4 w-4 mr-1.5" />Save</>
            )}
          </Button>

          {aiEnabled && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAtsCheck}
                className="h-9 px-4 text-sm font-medium rounded-xl active:scale-95 border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/50 animate-[ats-glow_4s_ease-in-out_infinite] transition-all duration-300"
              >
                <Target className="h-4 w-4 mr-1.5" />ATS Check
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleInterviewPrep}
                className="h-9 px-4 text-sm font-medium rounded-xl active:scale-95 text-accent hover:text-accent-foreground hover:bg-accent/20"
              >
                <Brain className="h-4 w-4 mr-1.5" />Prep
              </Button>
            </>
          )}


          {job.is_reviewing && (
            <Badge className="ml-auto px-2.5 py-1.5 text-xs font-medium bg-success-bg text-success-text border-0 rounded-full">
              Actively Reviewing
            </Badge>
          )}
        </div>
      </div>

      <AtsCheckDialog
        open={showAtsDialog}
        onOpenChange={setShowAtsDialog}
        result={result}
        isChecking={isChecking}
      />

      <InterviewPrepDialog
        open={showPrepDialog}
        onOpenChange={setShowPrepDialog}
        prep={prep}
        isLoading={isPrepLoading}
        jobTitle={job.title}
        hasResume={!!(profile?.resume_intelligence as ResumeIntelligence | null)?.primaryRole}
      />


      {/* Content */}
      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-chip-bg text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>

          {job.salary_range && !/nan/i.test(job.salary_range) && !/none/i.test(job.salary_range) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-success-bg text-xs text-success-text font-medium">
              <DollarSign className="h-3.5 w-3.5" />
              {job.salary_range}
            </span>
          )}

          {job.employment_type && !/nan/i.test(job.employment_type) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-chip-bg text-xs text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              {job.employment_type}
            </span>
          )}

          {job.experience_years && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-chip-bg text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {job.experience_years}
            </span>
          )}

          <VisaSponsorshipBadge result={analyzeVisaSponsorship(job)} />
        </div>

        {/* Job Description - LinkedIn-style */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">About the role</h4>
          <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line prose prose-sm max-w-none">
            {job.description}
          </div>
        </div>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Skills & Technologies</h4>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs font-normal px-2.5 py-1 rounded-full bg-chip-bg text-foreground border-0 hover:bg-secondary transition-colors"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Landing Probability */}
        {landingProbability && (
          <LandingProbabilityPanel result={landingProbability} />
        )}

        {/* Smart Resume Tips */}
        <SmartResumeTips job={job} intelligence={profile?.resume_intelligence as ResumeIntelligence | null | undefined} />
      </div>
    </div>
  );
}
