import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { JobCard } from "@/components/JobCard";
import { JobPreviewPanel } from "@/components/JobPreviewPanel";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ApplyConfirmDialog } from "@/components/ApplyConfirmDialog";
import { PostApplyConfirmDialog } from "@/components/PostApplyConfirmDialog";
import { ProfileGateDialog } from "@/components/ProfileGateDialog";
import { VisaFilterPills } from "@/components/VisaFilterPills";
import { VisaSponsorshipBadge } from "@/components/VisaSponsorshipBadge";
import { useJobSearchPaginated } from "@/hooks/useJobSearchPaginated";
import { useProfile } from "@/hooks/useProfile";
import { useJobContext } from "@/context/JobContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsUSUser } from "@/hooks/useIsUSUser";
import { calculateMatchesForJobs } from "@/lib/jobMatcher";
import { analyzeVisaSponsorship, filterJobsByVisa, VisaFilter } from "@/lib/visaSponsorship";
import { Job } from "@/types/job";
import { X, Globe, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function VisaJobs() {
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [visaFilter, setVisaFilter] = useState<VisaFilter>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const isMobile = useIsMobile();
  const { showUpgradeDialog, setShowUpgradeDialog, showApplyConfirm, confirmApply, cancelApply, showPostApplyConfirm, confirmPostApply, dismissPostApply, showProfileGate, setShowProfileGate, profileGateMissingFields, pendingJobTitle, pendingJobCompany, totalAppCount, isPremium: isPremiumUser } = useJobContext();
  const { profile } = useProfile();
  const isUSUser = useIsUSUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUSUser) {
      toast({ title: "This section is for US-based job seekers only 🇺🇸" });
      navigate("/dashboard", { replace: true });
    }
  }, [isUSUser, navigate, toast]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [visaFilter]);

  // Fetch a larger set to filter client-side for visa
  const { data, isLoading } = useJobSearchPaginated({
    searchQuery: searchInput,
    page: currentPage,
  });

  const allJobs = data?.jobs || [];
  const filteredJobs = useMemo(() => filterJobsByVisa(allJobs, visaFilter), [allJobs, visaFilter]);

  const matchResults = useMemo(
    () => calculateMatchesForJobs(filteredJobs, profile?.resume_intelligence),
    [filteredJobs, profile?.resume_intelligence]
  );

  const sponsorCount = useMemo(() => {
    return allJobs.filter(j => {
      const r = analyzeVisaSponsorship(j);
      return r.status === "sponsors" || r.status === "opt_friendly" || r.status === "stem_opt";
    }).length;
  }, [allJobs]);

  const handleJobTap = useCallback((job: Job) => {
    if (isMobile) {
      setMobilePreviewJob(job);
      setMobileSheetOpen(true);
    } else {
      setSelectedJob(prev => prev?.id === job.id ? null : job);
    }
  }, [isMobile]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-4"
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-1 flex items-center gap-2">
                <Globe className="h-7 w-7 text-accent" />
                Visa & Sponsorship Jobs
              </h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{sponsorCount}</span> sponsorship-friendly jobs found
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            <SearchBar
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search visa-friendly jobs…"
            />
            <VisaFilterPills value={visaFilter} onChange={setVisaFilter} />
          </div>
        </div>

        {/* Content */}
        {isMobile ? (
          <div className="flex flex-col gap-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-16">
                <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No jobs found for this visa filter.</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Try broadening your search or filter.</p>
              </div>
            ) : (
              filteredJobs.map(job => {
                const visa = analyzeVisaSponsorship(job);
                return (
                  <div key={job.id} className="relative">
                    <JobCard
                      job={job}
                      onTap={handleJobTap}
                      isSelected={selectedJob?.id === job.id}
                      matchResult={matchResults.get(job.id)}
                    />
                    <div className="absolute top-3 left-3 z-10">
                      <VisaSponsorshipBadge result={visa} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div
            className="grid gap-4 mx-auto"
            style={{
              gridTemplateColumns: selectedJob ? '40% 60%' : '1fr',
              maxWidth: selectedJob ? undefined : 800,
            }}
          >
            <div className="flex flex-col gap-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-16">
                  <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No jobs found for this visa filter.</p>
                </div>
              ) : (
                filteredJobs.map(job => {
                  const visa = analyzeVisaSponsorship(job);
                  return (
                    <div key={job.id} className="relative">
                      <JobCard
                        job={job}
                        onTap={handleJobTap}
                        isSelected={selectedJob?.id === job.id}
                        matchResult={matchResults.get(job.id)}
                      />
                      <div className="absolute top-3 left-3 z-10">
                        <VisaSponsorshipBadge result={visa} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedJob && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedJob.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="border border-border/50 rounded-2xl bg-card/80 backdrop-blur-sm shadow-card relative flex flex-col sticky top-[88px] self-start"
                >
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {/* Visa badge in preview */}
                  <div className="absolute top-3 left-3 z-20">
                    <VisaSponsorshipBadge result={analyzeVisaSponsorship(selectedJob)} />
                  </div>
                  <JobPreviewPanel job={selectedJob} matchResult={matchResults.get(selectedJob.id)} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </motion.div>

      <MobileJobPreviewSheet job={mobilePreviewJob} open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} />
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <ApplyConfirmDialog open={showApplyConfirm} onConfirm={confirmApply} onCancel={cancelApply} jobTitle={pendingJobTitle} company={pendingJobCompany} applicationsUsed={totalAppCount} isPremium={isPremiumUser} />
      <PostApplyConfirmDialog open={showPostApplyConfirm} onYes={confirmPostApply} onNo={dismissPostApply} jobTitle={pendingJobTitle} company={pendingJobCompany} />
      <ProfileGateDialog open={showProfileGate} onOpenChange={setShowProfileGate} missingFields={profileGateMissingFields} />
    </Layout>
  );
}
