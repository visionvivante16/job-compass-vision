import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Job } from "@/types/job";
import { Loader2, Shield, Pencil, Trash2, Copy, Plus, FileSpreadsheet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface AdminJobsListProps {
  jobs: Job[];
  isLoading: boolean;
  isFounder: boolean;
  canEditJobs: boolean;
  canDeleteJobs: boolean;
  canPostJobs: boolean;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onDuplicate: (job: Job) => void;
  onTogglePublished: (job: Job) => void;
  onToggleReviewing: (job: Job) => void;
  onAddJob: () => void;
  onBulkUpload: () => void;
  duplicateIsPending: boolean;
}

const JOBS_PER_PAGE = 20;

export function AdminJobsList({
  jobs,
  isLoading,
  isFounder,
  canEditJobs,
  canDeleteJobs,
  canPostJobs,
  onEdit,
  onDelete,
  onDuplicate,
  onTogglePublished,
  onToggleReviewing,
  onAddJob,
  onBulkUpload,
  duplicateIsPending,
}: AdminJobsListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * JOBS_PER_PAGE;
    return jobs.slice(start, start + JOBS_PER_PAGE);
  }, [jobs, currentPage]);

  // Reset to page 1 if jobs list shrinks
  useMemo(() => {
    if (currentPage > 1 && (currentPage - 1) * JOBS_PER_PAGE >= jobs.length) {
      setCurrentPage(1);
    }
  }, [jobs.length]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-12 text-center border-border/60">
        <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">No jobs yet</h3>
        <p className="text-muted-foreground mb-6">
          {canPostJobs ? "Create your first job listing or upload via CSV" : "No jobs available to manage"}
        </p>
        {canPostJobs && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={onBulkUpload}>
              <FileSpreadsheet className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button variant="accent" onClick={onAddJob}>
              <Plus className="h-4 w-4" />
              Add Job
            </Button>
          </div>
        )}
      </Card>
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
    <div className="space-y-4">
      {paginatedJobs.map((job) => (
        <Card key={job.id} className="p-5 border-border/60">
          <div className="flex items-start gap-4">
            <CompanyLogo
              logoUrl={job.company_logo}
              companyName={job.company}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg truncate">
                    {job.title}
                  </h3>
                  <p className="text-muted-foreground">{job.company}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.location} • Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!job.is_published && (
                    <Badge variant="outline">Draft</Badge>
                  )}
                  {job.is_published && (
                    <Badge variant="accent">Published</Badge>
                  )}
                  {job.is_reviewing && (
                    <Badge variant="success">Reviewing</Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {job.skills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
            <div className="flex items-center gap-6">
              {(isFounder || canEditJobs) && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={job.is_published}
                      onCheckedChange={() => onTogglePublished(job)}
                    />
                    <span className="text-sm text-muted-foreground">Published</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={job.is_reviewing}
                      onCheckedChange={() => onToggleReviewing(job)}
                    />
                    <span className="text-sm text-muted-foreground">Reviewing</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {(isFounder || canPostJobs) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(job)}
                  disabled={duplicateIsPending}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
              )}
              {(isFounder || canEditJobs) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(job)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {(isFounder || canDeleteJobs) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(job.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
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
                      onClick={() => setCurrentPage(page as number)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Showing {(currentPage - 1) * JOBS_PER_PAGE + 1}–{Math.min(currentPage * JOBS_PER_PAGE, jobs.length)} of {jobs.length} jobs
          </p>
        </div>
      )}
    </div>
  );
}
