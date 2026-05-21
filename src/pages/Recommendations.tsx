import { useEffect, useState, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { JobPreviewPanel } from "@/components/JobPreviewPanel";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ApplyConfirmDialog } from "@/components/ApplyConfirmDialog";
import { PostApplyConfirmDialog } from "@/components/PostApplyConfirmDialog";
import { ProfileGateDialog } from "@/components/ProfileGateDialog";
import { useRecommendedJobs, RecommendedJob } from "@/hooks/useRecommendedJobs";
import { useJobContext } from "@/context/JobContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Job } from "@/types/job";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export default function Recommendations() {
  const { data: jobs, isLoading, canRecommend } = useRecommendedJobs();
  const {
    showUpgradeDialog,
    setShowUpgradeDialog,
    showApplyConfirm,
    confirmApply,
    cancelApply,
    showPostApplyConfirm,
    confirmPostApply,
    dismissPostApply,
    isApplied,
    showProfileGate,
    setShowProfileGate,
    profileGateMissingFields,
    pendingJobTitle,
    pendingJobCompany,
    totalAppCount,
    isPremium: isPremiumUser,
  } = useJobContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [selectedJob, setSelectedJob] = useState<RecommendedJob | null>(null);
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleJobTap = useCallback(
    (job: Job) => {
      const recJob = jobs?.find((j) => j.id === job.id) || null;
      if (isMobile) {
        setMobilePreviewJob(job);
        setMobileSheetOpen(true);
      } else {
        setSelectedJob((prev) => (prev?.id === job.id ? null : recJob));
      }
    },
    [isMobile, jobs]
  );

  const filteredJobs = useMemo(() => {
    return (jobs || []).filter((job) => !isApplied(job.id));
  }, [jobs, isApplied]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const pageStart = filteredJobs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredJobs.length);

  const paginatedJobs = useMemo(
    () => filteredJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredJobs, currentPage]
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setSelectedJob((prev) => {
      if (!prev) return null;
      return paginatedJobs.some((job) => job.id === prev.id) ? prev : null;
    });
  }, [paginatedJobs]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedJob(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6"
      >
        <div className="flex gap-6 justify-center">
          <div className="flex-1 max-w-[600px] min-w-0">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-accent" />
                <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  Recommended for you
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Jobs matched to your resume, skills, and experience.
                {filteredJobs.length > 0 && (
                  <span className="ml-1">
                    <span className="font-medium text-foreground">{filteredJobs.length}</span> recommendation{filteredJobs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-5 border border-border/60 bg-card rounded-2xl space-y-3 shadow-card">
                    <div className="flex items-start gap-3.5">
                      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-7 w-20 rounded-full" />
                      <Skeleton className="h-7 w-24 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !canRecommend ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 max-w-sm mx-auto"
              >
                <div className="h-20 w-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <FileText className="h-8 w-8 text-accent/60" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                  Get personalized job recommendations
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Upload your resume or fill in your profile skills to get matched with relevant jobs.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => navigate("/profile")}
                    className="rounded-full px-5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/profile")}
                    className="rounded-full px-5"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Add Skills
                  </Button>
                </div>
              </motion.div>
            ) : filteredJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 max-w-sm mx-auto"
              >
                <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground text-sm">
                  We couldn't find matching jobs right now. Try updating your profile with more skills.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginatedJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.35, ease: "easeOut" }}
                  >
                    <div className="relative">
                      <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1.5">
                        {job.matchResult && job.matchResult.score >= 70 && (
                          <Badge className="bg-accent/15 text-accent border-accent/20 text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm cursor-default">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Best Match
                          </Badge>
                        )}
                        {job.matchScore > 0 && (
                          <Badge
                            className={
                              job.matchScore >= 70
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm cursor-default"
                                : job.matchScore >= 50
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm cursor-default"
                                  : "bg-muted text-muted-foreground border-0 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm cursor-default"
                            }
                          >
                            {job.matchScore}% Match
                          </Badge>
                        )}
                      </div>
                      <JobCard
                        job={job}
                        onTap={handleJobTap}
                        isSelected={selectedJob?.id === job.id}
                        context="recommendations"
                      />
                      {(() => {
                        const matched = job.matchResult?.matchedSkills?.slice(0, 3) || [];
                        const titleHit = job.matchResult && job.matchResult.score >= 60;
                        if (matched.length === 0 && !titleHit) return null;
                        const parts: string[] = [];
                        if (titleHit) parts.push(`title aligns with "${job.title}"`);
                        if (matched.length > 0) parts.push(`matches your ${matched.join(", ")}`);
                        return (
                          <p className="mt-2 text-[11px] text-muted-foreground italic px-1">
                            <Sparkles className="inline h-3 w-3 mr-1 text-accent/70" />
                            Why this job: {parts.join(" — ")}.
                          </p>
                        );
                      })()}
                    </div>
                  </motion.div>
                ))}

                <div className="py-4 space-y-3">
                  <p className="text-center text-xs text-muted-foreground">
                    Showing {pageStart}–{pageEnd} of {filteredJobs.length}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((page, idx) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={currentPage === page}
                              onClick={() => handlePageChange(page as number)}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="hidden lg:flex shrink-0">
              <AnimatePresence mode="wait">
                {selectedJob && (
                  <motion.div
                    key={selectedJob.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-[580px] shrink-0 sticky top-[88px] self-start border border-border/50 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden shadow-card h-[calc(100vh-112px)] flex flex-col min-h-0"
                  >
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
                      aria-label="Close preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex-1 min-h-0">
                      <JobPreviewPanel job={selectedJob} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      <MobileJobPreviewSheet job={mobilePreviewJob} open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} />
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <ApplyConfirmDialog open={showApplyConfirm} onConfirm={confirmApply} onCancel={cancelApply} jobTitle={pendingJobTitle} company={pendingJobCompany} applicationsUsed={totalAppCount} isPremium={isPremiumUser} />
      <PostApplyConfirmDialog open={showPostApplyConfirm} onYes={confirmPostApply} onNo={dismissPostApply} jobTitle={pendingJobTitle} company={pendingJobCompany} />
      <ProfileGateDialog open={showProfileGate} onOpenChange={setShowProfileGate} missingFields={profileGateMissingFields} />
    </Layout>
  );
}
