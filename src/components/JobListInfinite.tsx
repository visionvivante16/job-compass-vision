import { useEffect, useRef, useCallback } from "react";
import { Job } from "@/types/job";
import { JobCard } from "@/components/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Loader2, Search } from "lucide-react";

interface JobListInfiniteProps {
  jobs: Job[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onTap?: (job: Job) => void;
}

function JobCardSkeleton() {
  return (
    <div className="p-5 border border-border/60 bg-card rounded-2xl space-y-3">
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
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

export function JobListInfinite({
  jobs,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onTap,
}: JobListInfiniteProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;
    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px",
    });
    observerRef.current.observe(element);
    return () => { observerRef.current?.disconnect(); };
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-[600px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ animationDelay: `${i * 80}ms` }} className="stagger-fade-in">
            <JobCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20 max-w-sm mx-auto">
        <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
          <Search className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-2">No jobs found</h3>
        <p className="text-muted-foreground text-sm">Try adjusting your search or filters to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-[600px]">
      {jobs.map((job, index) => (
        <div
          key={job.id}
          className="stagger-fade-in"
          style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
        >
          <JobCard job={job} onTap={onTap} />
        </div>
      ))}

      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && (
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        )}
        {!hasNextPage && jobs.length > 0 && (
          <p className="text-sm text-muted-foreground">All jobs loaded</p>
        )}
      </div>
    </div>
  );
}
