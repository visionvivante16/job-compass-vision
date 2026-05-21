import { useState } from "react";
import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MapPin, Clock, DollarSign, Briefcase, Bookmark, BookmarkCheck, ExternalLink, BriefcaseBusiness } from "lucide-react";
import { formatJobTimestamp } from "@/lib/jobTimestamp";
import { useNavigate } from "react-router-dom";


interface MobileJobPreviewSheetProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileJobPreviewSheet({ job, open, onOpenChange }: MobileJobPreviewSheetProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  

  if (!job) return null;
  
  const saved = isSaved(job.id);
  const applied = isApplied(job.id);

  const handleSaveClick = () => {
    if (!user) {
      navigate("/auth");
      onOpenChange(false);
      return;
    }
    if (saved) {
      unsaveJob(job.id);
    } else {
      saveJob(job);
    }
  };

  const handleApplyClick = () => {
    if (!user) {
      navigate("/auth");
      onOpenChange(false);
      return;
    }
    applyToJob(job);
  };

  const handleTitleClick = () => {
    if (!user) {
      navigate("/auth");
      onOpenChange(false);
      return;
    }
    applyToJob(job);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-5 border-b border-border">
            <div className="flex items-start gap-4">
              <CompanyLogo 
                logoUrl={job.company_logo} 
                companyName={job.company} 
                size="lg"
                className="rounded-xl"
              />
              <div className="flex-1 min-w-0 text-left">
                <SheetTitle 
                  className="font-bold text-foreground text-lg leading-tight line-clamp-2 cursor-pointer hover:text-accent transition-colors"
                  onClick={handleTitleClick}
                >
                  {job.title}
                </SheetTitle>
                <p className="text-muted-foreground text-sm mt-0.5">{job.company}</p>
                <div className="flex items-center gap-2 mt-2">
                  {job.is_reviewing && (
                    <Badge 
                      className="px-2.5 py-1 text-xs font-medium bg-success-bg text-success-text border-0 rounded-full"
                    >
                      Actively Reviewing
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatJobTimestamp(job.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 p-5">
            {/* Meta Row - Chip Style */}
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
            </div>

            {/* Full Description */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {job.description}
              </p>
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div className="pb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary" 
                      className="text-xs font-normal px-2.5 py-1 rounded-full bg-chip-bg text-foreground border-0"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Fixed Bottom Actions */}
          <div className="p-5 border-t border-border flex items-center gap-3 bg-card">
            <Button
              variant="outline"
              onClick={handleSaveClick}
              className={`flex-1 h-12 text-sm font-medium rounded-xl ${saved ? "text-accent border-accent" : ""}`}
            >
              {saved ? (
                <><BookmarkCheck className="h-4 w-4 mr-2" />Saved</>
              ) : (
                <><Bookmark className="h-4 w-4 mr-2" />Save</>
              )}
            </Button>
            <Button
              onClick={handleApplyClick}
              className={`flex-1 h-12 text-sm font-medium rounded-xl ${
                applied 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
              }`}
            >
              {applied ? "Applied" : (
                <><ExternalLink className="h-4 w-4 mr-2" />Apply</>
              )}
            </Button>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
