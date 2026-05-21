import { memo } from "react";
import { Job } from "@/types/job";
import { JobMatchResult } from "@/lib/jobMatcher";
import { LandingProbabilityResult } from "@/lib/landingProbability";
import { JobCard } from "@/components/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface JobListPaginatedProps {
  jobs: Job[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTap?: (job: Job) => void;
  selectedJobId?: string | null;
  matchResults?: Map<string, JobMatchResult>;
  landingResults?: Map<string, LandingProbabilityResult>;
  searchQuery?: string;
}

function JobCardSkeleton() {
  return (
    <div className="p-5 border border-border/40 bg-card/80 backdrop-blur-sm rounded-2xl space-y-3 shadow-card overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent animate-shimmer bg-[length:200%_100%]" />
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex justify-between gap-3 pt-3 border-t border-border/30">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

export const JobListPaginated = memo(function JobListPaginated({
  jobs,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onTap,
  selectedJobId,
  matchResults,
  landingResults,
  searchQuery,
}: JobListPaginatedProps) {
  // Note: we used to hide applied jobs here, but that caused pages to look
  // empty when many results overlapped with the user's history (e.g. broad
  // searches like "Data Analyst"). Applied jobs now stay visible — the JobCard
  // already shows an "Applied ✓" state and disables the apply button.
  const visibleJobs = jobs;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-[600px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (visibleJobs.length === 0 && jobs.length === 0) {
    return (
      <div className="text-center py-20 max-w-sm mx-auto">
        <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
          <Search className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-2">No jobs found</h3>
        <p className="text-muted-foreground text-sm">
          {searchQuery?.trim()
            ? `No jobs found for "${searchQuery.trim()}". Try a different search term.`
            : "Try adjusting your search or filters to find what you're looking for."}
        </p>
      </div>
    );
  }

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
    <div className="flex flex-col gap-4 max-w-[600px]">
      {visibleJobs.map((job, idx) => (
        <div key={job.id} {...(idx === 0 ? { "data-tour": "job-card" } : {})}>
          <JobCard
            job={job}
            onTap={onTap}
            isSelected={selectedJobId === job.id}
            matchResult={matchResults?.get(job.id)}
            landingProbability={landingResults?.get(job.id)}
          />
        </div>
      ))}

      {totalPages > 1 && (
        <div className="py-4 sticky bottom-0 bg-background/95 backdrop-blur-sm z-10">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
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
                      onClick={() => onPageChange(page as number)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
});
