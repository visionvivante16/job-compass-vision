import { useState, useMemo, useCallback, useEffect, useTransition, useDeferredValue } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { calculateMatchesForJobs } from "@/lib/jobMatcher";
import { useRecommendedJobs } from "@/hooks/useRecommendedJobs";
import { calculateLandingProbability } from "@/lib/landingProbability";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { JobPreviewPanel } from "@/components/JobPreviewPanel";
import { JobListPaginated } from "@/components/JobListPaginated";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ApplyConfirmDialog } from "@/components/ApplyConfirmDialog";
import { PostApplyConfirmDialog } from "@/components/PostApplyConfirmDialog";
import { ProfileGateDialog } from "@/components/ProfileGateDialog";
import { useJobSearchPaginated } from "@/hooks/useJobSearchPaginated";
import { useJobContext } from "@/context/JobContext";
import { Job } from "@/types/job";
import { X, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { JobMatchesPanel } from "@/components/JobMatchesPanel";

import { WelcomeBanner } from "@/components/WelcomeBanner";
import { LinkedInFeatureAnnouncementInline } from "@/components/LinkedInFeatureAnnouncementInline";
import { ResumeUploadBanner } from "@/components/ResumeUploadBanner";

import { VisaFilter } from "@/lib/visaSponsorship";
import { useIsUSUser } from "@/hooks/useIsUSUser";
import { NotificationOptInDialog } from "@/components/NotificationOptInDialog";
import { ExtensionPasswordPrompt } from "@/components/ExtensionPasswordPrompt";
import { consumeDashboardResetToken, DASHBOARD_RESET_EVENT } from "@/lib/dashboardReset";
import { useResumeEmail } from "@/hooks/useResumeEmail";
import { DASHBOARD_PAGE_SIZE, useDashboardPriorityJobs } from "@/hooks/useDashboardPriorityJobs";

import { RoleRequestBanner } from "@/components/RoleRequestBanner";
import { RoleRequestModal } from "@/components/RoleRequestModal";
import { PremiumUpgradeBanner } from "@/components/PremiumUpgradeBanner";
import { LinkedInFeatureBanner } from "@/components/LinkedInFeatureBanner";
import { AutoApplyBanner } from "@/components/AutoApplyBanner";
import { DashboardFilterBar } from "@/components/DashboardFilterBar";
import { getCategoryById, titleMatchesCategory } from "@/lib/roleCategories";
import { RelatedSearches } from "@/components/RelatedSearches";
import { StreakCard } from "@/components/StreakCard";
import { NewJobsBadge } from "@/components/NewJobsBadge";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { useUserStreak } from "@/hooks/useRetention";



type DateFilter = "all" | "today" | "yesterday" | "custom";

function getDateRange(filter: DateFilter, customDate?: Date | undefined): { dateFrom: string | null; dateTo: string | null } {
  if (filter === "all") return { dateFrom: null, dateTo: null };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "today") {
    return { dateFrom: today.toISOString().split("T")[0], dateTo: null };
  }
  if (filter === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { dateFrom: yesterday.toISOString().split("T")[0], dateTo: today.toISOString().split("T")[0] };
  }
  if (filter === "custom" && customDate) {
    const from = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate());
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to.toISOString().split("T")[0] };
  }
  return { dateFrom: null, dateTo: null };
}

const chipVariants = {
  inactive: { scale: 1 },
  active: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  tap: { scale: 0.95 },
};

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [committedQuery, setCommittedQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [allTimeDropdownOpen, setAllTimeDropdownOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [visaFilter, setVisaFilter] = useState<VisaFilter>("all");
  const [isSearchPending, startSearchTransition] = useTransition();
  const [roleRequestOpen, setRoleRequestOpen] = useState(false);

  const isMobile = useIsMobile();
  const { showUpgradeDialog, setShowUpgradeDialog, showApplyConfirm, confirmApply, cancelApply, showPostApplyConfirm, confirmPostApply, dismissPostApply, showProfileGate, setShowProfileGate, profileGateMissingFields, pendingJobTitle, pendingJobCompany, totalAppCount, isPremium: isPremiumUser } = useJobContext();
  const { toast } = useToast();
  const isUSUser = useIsUSUser();
  
  // Send one-time welcome/recommendation email on first visit
  useResumeEmail();
  const performDashboardReset = useCallback(() => {
    sessionStorage.removeItem("pending_search");
    setSearchInput("");
    setCommittedQuery("");
    setCurrentPage(1);
    setDateFilter("all");
    setMobilePreviewJob(null);
    setMobileSheetOpen(false);
    setSelectedJob(null);
    setRoleFilter(null);
    setCategoryId(null);
    setCompanyFilter(null);
    setAllTimeDropdownOpen(false);
    setCustomDate(undefined);
    setFallbackActive(false);
    setVisaFilter("all");
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (searchParams.get("premium") === "true") {
      toast({ title: "🎉 Premium unlocked!", description: "You can now apply to unlimited jobs." });
      searchParams.delete("premium");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);


  // Handle pending search from landing page tag click
  useEffect(() => {
    const pendingSearch = sessionStorage.getItem("pending_search");
    if (pendingSearch) {
      sessionStorage.removeItem("pending_search");
      setSearchInput(pendingSearch);
      setCommittedQuery(pendingSearch);
      setDateFilter("all");
      setSearchParams({ search: pendingSearch }, { replace: true });
    }
  }, []);

  useEffect(() => {
    const handleDashboardReset = () => performDashboardReset();

    window.addEventListener(DASHBOARD_RESET_EVENT, handleDashboardReset);

    if (consumeDashboardResetToken()) {
      performDashboardReset();
    }

    return () => {
      window.removeEventListener(DASHBOARD_RESET_EVENT, handleDashboardReset);
    };
  }, [performDashboardReset]);

  // Reset all filters when URL search params are cleared (e.g. logo click)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (!urlSearch) {
      setSearchInput("");
      setCommittedQuery("");
      setRoleFilter(null);
      setCategoryId(null);
      setCompanyFilter(null);
      setDateFilter("all");
      setCustomDate(undefined);
      setFallbackActive(false);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const handleSearchChange = useCallback((value: string) => {
    startSearchTransition(() => {
      setSearchInput((prev) => (prev === value ? prev : value));
    });
    setRoleFilter(null);
    setCategoryId(null);
    setCompanyFilter(null);
    setSelectedJob(null);
    setMobilePreviewJob(null);
    setMobileSheetOpen(false);
  }, []);

  const handleSearchCommit = useCallback((committedValue?: string) => {
    setCurrentPage(1);
    setFallbackActive(false);
    setRoleFilter(null);
    setCategoryId(null);
    setCompanyFilter(null);
    setSelectedJob(null);
    setMobilePreviewJob(null);
    setMobileSheetOpen(false);
    const next = (committedValue ?? searchInput).trim();
    setCommittedQuery((prev) => (prev === next ? prev : next));
    // When the user searches anything, show ALL-time matches sorted by latest
    // updated time first (priority), not just today's jobs.
    if (next.length > 0) {
      setDateFilter("all");
      setCustomDate(undefined);
    }
  }, [searchInput]);

  const handleRelatedSelect = useCallback((term: string) => {
    setSearchInput(term);
    setCommittedQuery(term);
    setCurrentPage(1);
    setFallbackActive(false);
    setRoleFilter(null);
    setCategoryId(null);
    setCompanyFilter(null);
    setSelectedJob(null);
    setMobilePreviewJob(null);
    setMobileSheetOpen(false);
    if (term.trim().length > 0) {
      setDateFilter("all");
      setCustomDate(undefined);
    }
  }, []);

  const selectedCategory = useMemo(
    () => (categoryId ? getCategoryById(categoryId) : undefined),
    [categoryId]
  );

  const combinedSearchQuery = useMemo(() => {
    const parts: string[] = [];
    const search = searchInput.trim();
    // Skip very short partial queries to avoid broad/slow DB searches
    if (search.length >= 2) parts.push(search);
    if (search.length >= 2) return parts.join(" ");
    if (selectedCategory) parts.push(selectedCategory.searchTerm);
    if (roleFilter) parts.push(roleFilter);
    if (companyFilter) parts.push(companyFilter);
    return parts.join(" ");
  }, [searchInput, selectedCategory, roleFilter, companyFilter]);

  const { dateFrom, dateTo } = getDateRange(dateFilter, customDate);
  // Today/Yesterday → server-side filterTab so all matching jobs are reachable
  // (avoids 120-row client slice losing matches). Custom dates stay client-side.
  const serverFilterTab: "all" | "today" | "yesterday" =
    dateFilter === "today" ? "today" : dateFilter === "yesterday" ? "yesterday" : "all";
  const useServerTab = serverFilterTab !== "all";
  const allowDateFallback = !combinedSearchQuery.trim() && !roleFilter && !companyFilter;
  const effectiveFallbackActive = fallbackActive && allowDateFallback;

  useEffect(() => {
    setCurrentPage(1);
    setFallbackActive(false);
    setSelectedJob(null);
    setMobilePreviewJob(null);
    setMobileSheetOpen(false);
  }, [combinedSearchQuery, dateFilter, customDate, visaFilter]);

  const { data: searchData, isLoading: searchLoading, isFetching: searchFetching } = useJobSearchPaginated({
    searchQuery: combinedSearchQuery,
    page: currentPage,
    dateFrom: effectiveFallbackActive || useServerTab ? null : dateFrom,
    dateTo: effectiveFallbackActive || useServerTab ? null : dateTo,
    visaFilter,
    filterTab: effectiveFallbackActive ? "all" : serverFilterTab,
  });

  const { profile } = useProfile();
  const { user } = useAuth();
  const {
    data: recommendedJobs = [],
    isLoading: recommendedLoading,
    isFetching: recommendedFetching,
  } = useRecommendedJobs();

  // Show subtle toast for auto-premium (first 100) users — once per session
  useEffect(() => {
    if (
      profile?.is_premium === true &&
      user?.id &&
      !sessionStorage.getItem("priority_premium_shown")
    ) {
      const checkAutoPremium = async () => {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase
          .from("user_subscriptions")
          .select("is_subscribed")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (!data?.is_subscribed) {
          toast({
            title: "🌟 You just unlocked Premium as a priority user",
            description: "Enjoy unlimited applications and all premium features.",
          });
        }
        sessionStorage.setItem("priority_premium_shown", "true");
      };
      checkAutoPremium();
    }
  }, [profile?.is_premium, user?.id, toast]);

  const intelligence = profile?.resume_intelligence as ResumeIntelligence | null | undefined;
  const rawJobs = searchData?.jobs || [];
  const shouldTryPersonalizedFeed =
    !combinedSearchQuery.trim() &&
    !roleFilter &&
    !companyFilter &&
    dateFilter === "all" &&
    visaFilter === "all" &&
    !!intelligence;

  const personalizedJobs = useMemo(() => {
    if (!shouldTryPersonalizedFeed || !intelligence) return [];

    // Resume-priority: sort by match score (highest first), then by recency.
    // Only kicks in when the user has a resume (intelligence is derived from it).
    return [...recommendedJobs].sort((a, b) => {
      const scoreDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return b.posted_date.getTime() - a.posted_date.getTime();
    });
  }, [shouldTryPersonalizedFeed, recommendedJobs, intelligence]);

  const usePriorityOrdering = shouldTryPersonalizedFeed && personalizedJobs.length > 0;

  const prioritizedPageQuery = useDashboardPriorityJobs({
    currentPage,
    enabled: usePriorityOrdering,
    priorityJobs: personalizedJobs,
  });

  const jobs = useMemo(() => {
    const base = !usePriorityOrdering
      ? rawJobs
      : (prioritizedPageQuery.data ?? rawJobs);

    // When a category pill is active (and no custom search), trust the server's
    // results so a 20-row page isn't reduced to ~2. Just sort by recency.
    if (!categoryId || searchInput.trim().length >= 2) return base;

    return [...base].sort(
      (a, b) => b.posted_date.getTime() - a.posted_date.getTime()
    );
  }, [usePriorityOrdering, prioritizedPageQuery.data, rawJobs, categoryId, searchInput]);

  const isLoading = usePriorityOrdering
    ? recommendedLoading || searchLoading || prioritizedPageQuery.isLoading
    : searchLoading;
  const isFetching = usePriorityOrdering
    ? recommendedFetching || searchFetching || prioritizedPageQuery.isFetching
    : searchFetching;

  // Defer heavy calculations so they don't block typing
  const deferredJobs = useDeferredValue(jobs);

  const matchResults = useMemo(
    () => calculateMatchesForJobs(deferredJobs, intelligence),
    [deferredJobs, intelligence]
  );

  const landingResults = useMemo(() => {
    if (!intelligence) return new Map();
    const results = new Map();
    for (const job of deferredJobs) {
      const lr = calculateLandingProbability(job, matchResults.get(job.id), intelligence);
      if (lr) results.set(job.id, lr);
    }
    return results;
  }, [deferredJobs, matchResults, intelligence]);

  useEffect(() => {
    if (!allowDateFallback || usePriorityOrdering || isLoading || dateFilter === "all" || effectiveFallbackActive || !searchData || searchData.totalCount !== 0) {
      return;
    }
    setFallbackActive(true);
  }, [allowDateFallback, usePriorityOrdering, isLoading, dateFilter, effectiveFallbackActive, searchData]);

  // When a search is active and "Today" returns no jobs, automatically
  // fall back to "Yesterday" so users still see the freshest possible results.
  useEffect(() => {
    if (
      !combinedSearchQuery.trim() ||
      isLoading ||
      isFetching ||
      dateFilter !== "today" ||
      !searchData ||
      searchData.totalCount !== 0
    ) {
      return;
    }
    setDateFilter("yesterday");
  }, [combinedSearchQuery, isLoading, isFetching, dateFilter, searchData]);

  const totalCount = searchData?.totalCount ?? 0;
  const totalPages = usePriorityOrdering
    ? Math.max(1, Math.ceil(totalCount / DASHBOARD_PAGE_SIZE))
    : (searchData?.totalPages ?? 1);

  // TEMP DIAGNOSTIC: trace why dashboard shows "No jobs found" for some users
  // useEffect(() => {
  //   console.log("[Dashboard diag]", {
  //     userId: user?.id,
  //     hasIntelligence: !!intelligence,
  //     shouldTryPersonalizedFeed,
  //     personalizedJobsLen: personalizedJobs.length,
  //     usePriorityOrdering,
  //     rawJobsLen: rawJobs.length,
  //     jobsLen: jobs.length,
  //     totalCount,
  //     searchDataExists: !!searchData,
  //     isLoading,
  //     isFetching,
  //     combinedSearchQuery,
  //     categoryId,
  //     visaFilter,
  //     dateFilter,
  //   });
  // }, [user?.id, intelligence, shouldTryPersonalizedFeed, personalizedJobs.length, usePriorityOrdering, rawJobs.length, jobs.length, totalCount, searchData, isLoading, isFetching, combinedSearchQuery, categoryId, visaFilter, dateFilter]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const { incrementJobView } = useUserStreak();

  const handleJobTap = useCallback((job: Job) => {
    if (isMobile) {
      setMobilePreviewJob(job);
      setMobileSheetOpen(true);
    } else {
      setSelectedJob(prev => prev?.id === job.id ? null : job);
    }
    // Fire-and-forget streak increment
    incrementJobView();
  }, [isMobile, incrementJobView]);

  const handleFilterByRole = useCallback((role: string) => {
    setRoleFilter(role);
    setCompanyFilter(null);
  }, []);

  const clearFilters = useCallback(() => {
    setRoleFilter(null);
    setCompanyFilter(null);
  }, []);

  const handleDateSelect = useCallback((value: DateFilter) => {
    if (value !== "custom") setCustomDate(undefined);
    setDateFilter(value);
    setAllTimeDropdownOpen(false);
    setCurrentPage(1);
    setFallbackActive(false);
  }, []);

  const handleCustomDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setCustomDate(date);
      setDateFilter("custom");
    }
  }, []);

  const handleClearCustomDate = useCallback(() => {
    setCustomDate(undefined);
    setDateFilter("all");
    setAllTimeDropdownOpen(false);
  }, []);

  const handleSelectCategory = useCallback((id: string | null) => {
    setCategoryId(id);
    setCurrentPage(1);
    // Clear search input so the category pill takes effect (search overrides pills otherwise)
    if (id) {
      setSearchInput("");
      setCommittedQuery("");
      setRoleFilter(null);
      setCompanyFilter(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("search");
        return next;
      }, { replace: true });
    }
  }, [setSearchParams]);

  const hasActiveFilter = roleFilter || companyFilter;
  const hasAnyActiveFilter =
    searchInput.trim().length > 0 ||
    committedQuery.trim().length > 0 ||
    dateFilter !== "all" ||
    !!customDate ||
    visaFilter !== "all" ||
    !!categoryId ||
    !!roleFilter ||
    !!companyFilter ||
    fallbackActive;
  const fallbackLabel = dateFilter === "today" ? "today" : dateFilter === "yesterday" ? "yesterday" : customDate ? format(customDate, "MMM d") : "";

  return (
    <Layout>
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-4">
        <LinkedInFeatureBanner />
        {/* Welcome Banner */}
        <WelcomeBanner />
        {/* LinkedIn Feature Inline Announcement */}
        <LinkedInFeatureAnnouncementInline />
        {/* Resume Upload CTA (only shown if no resume) */}
        <ResumeUploadBanner />
        <ProfileCompletionBanner />

        {/* Header + Search + Filters (above columns) */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-1">
                Job Board
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <NewJobsBadge />
                <StreakCard />
              </div>
            </div>
            <AutoApplyBanner />
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <SearchBar
                value={searchInput}
                onChange={handleSearchChange}
                onSearch={handleSearchCommit}
                onSuggestionSelect={handleRelatedSelect}
                placeholder="Search jobs by title…"
              />
            </div>
            <div className="shrink-0 overflow-x-auto scrollbar-hide -mx-1 px-1" data-tour="dashboard-filters">
              <DashboardFilterBar
                dateFilter={dateFilter}
                customDate={customDate}
                fallbackActive={fallbackActive}
                onDateSelect={handleDateSelect}
                onCustomDateSelect={handleCustomDateSelect}
                onClearCustomDate={handleClearCustomDate}
                categoryId={categoryId}
                onSelectCategory={handleSelectCategory}
                showVisaFilter={isUSUser}
                visaFilter={visaFilter}
                onVisaChange={setVisaFilter}
                hasAnyActiveFilter={hasAnyActiveFilter}
                onClearAll={performDashboardReset}
              />
            </div>
          </div>

          {/* Related searches — appears after a search is committed */}
          {committedQuery.trim().length >= 2 && (
            <RelatedSearches query={committedQuery} onSelect={handleRelatedSelect} />
          )}

          {/* Results count for committed search */}
          {committedQuery.trim().length >= 2 && !isLoading && (
            <p className="mb-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> job{totalCount !== 1 ? "s" : ""} found for{" "}
              <span className="font-medium text-foreground">"{committedQuery.trim()}"</span>
            </p>
          )}

          {!isLoading && (isSearchPending || isFetching) && (
            <div className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 border border-border/40 px-3 py-1.5 rounded-full">
              <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span>Updating results…</span>
            </div>
          )}
        </div>

        {/* Fallback note */}
        <AnimatePresence>
          {fallbackActive && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-muted-foreground mb-4 bg-secondary/50 px-3 py-2 rounded-lg border border-border/40"
            >
              No jobs posted {fallbackLabel} — showing All time results.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Active Role/Company Filters */}
        {hasActiveFilter && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            {roleFilter && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent cursor-pointer hover:bg-accent/20 transition-colors"
                onClick={clearFilters}
              >
                Role: {roleFilter}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {companyFilter && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={clearFilters}
              >
                Company: {companyFilter}
                <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
        )}

        {/* ===== 3-Column LinkedIn-style Grid (Desktop) ===== */}
        {isMobile ? (
          /* Mobile: single column job list */
          <div className="flex flex-col">
            <JobMatchesPanel />
            <div className="mt-4">
              <JobListPaginated
                jobs={jobs}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onTap={handleJobTap}
                selectedJobId={selectedJob?.id}
                matchResults={matchResults}
                landingResults={landingResults}
                searchQuery={searchInput}
              />
            </div>
          </div>
        ) : (
          /* Desktop: CSS Grid 3-column layout */
          <div
            className="grid gap-4 mx-auto"
            style={{
              gridTemplateColumns: selectedJob ? '30% 45% 25%' : '1fr minmax(280px, 340px)',
              maxWidth: selectedJob ? undefined : 1100,
            }}
          >
            {/* LEFT — Job List */}
            <div className={cn(
              "pr-2",
              selectedJob && "sticky top-[88px] self-start max-h-[calc(100vh-112px)] overflow-y-auto overscroll-contain scrollbar-thin"
            )}>
              {!selectedJob && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 space-y-3"
                >
                  <JobMatchesPanel />
                  <RoleRequestBanner />
                </motion.div>
              )}
              <JobListPaginated
                jobs={jobs}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onTap={handleJobTap}
                selectedJobId={selectedJob?.id}
                matchResults={matchResults}
                landingResults={landingResults}
                searchQuery={searchInput}
              />
            </div>

            {/* MIDDLE — Job Description (only when job selected) */}
            {selectedJob && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedJob.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="border border-border/50 rounded-2xl bg-card/80 backdrop-blur-sm shadow-card relative flex flex-col sticky top-[88px] self-start max-h-[calc(100vh-112px)] overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="sticky top-0 z-20 p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm ml-auto mr-3 mt-3 shrink-0"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin">
                    <JobPreviewPanel job={selectedJob} matchResult={matchResults.get(selectedJob.id)} landingProbability={landingResults.get(selectedJob.id)} />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* RIGHT — Sidebar (always visible) */}
            <div className="self-start sticky top-[88px] space-y-4">
              {/* PROMO: app is free for everyone — re-enable PremiumUpgradeBanner when premium returns */}
              {/* <PremiumUpgradeBanner /> */}
              <RightSidebar onFilterByRole={handleFilterByRole} />
            </div>
          </div>
        )}
        </div>

      <MobileJobPreviewSheet job={mobilePreviewJob} open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} />
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <ApplyConfirmDialog open={showApplyConfirm} onConfirm={confirmApply} onCancel={cancelApply} jobTitle={pendingJobTitle} company={pendingJobCompany} applicationsUsed={totalAppCount} isPremium={isPremiumUser} />
      <PostApplyConfirmDialog open={showPostApplyConfirm} onYes={confirmPostApply} onNo={dismissPostApply} jobTitle={pendingJobTitle} company={pendingJobCompany} />
      <ProfileGateDialog open={showProfileGate} onOpenChange={setShowProfileGate} missingFields={profileGateMissingFields} />
      <NotificationOptInDialog />
      <ExtensionPasswordPrompt />
      <RoleRequestModal open={roleRequestOpen} onOpenChange={setRoleRequestOpen} />
    </Layout>
  );
}
