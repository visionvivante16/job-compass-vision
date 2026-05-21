import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/types/job";
import { expandSearchTerms } from "@/lib/searchExpansion";
import { enrichJobList } from "@/lib/jobEnrichment";
import { useEffect, useMemo, useRef } from "react";

import { VisaFilter, filterJobsByVisa } from "@/lib/visaSponsorship";
import { useDebounce } from "@/hooks/useDebounce";
import { hasEntryLevelIntent, stripEntryLevelKeywords } from "@/lib/jobFilters";
import { useProfile } from "@/hooks/useProfile";
import { useAppliedSavedJobIds } from "@/hooks/useAppliedSavedJobIds";
import { buildProfileFallbackIntelligence } from "@/hooks/useRecommendedJobs";
import { calculateJobMatch } from "@/lib/jobMatcher";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";

const PAGE_SIZE = 20;
const FIRST_PAGE_OVERFETCH_SIZE = 120;
const PERSONALIZED_POOL_SIZE = 300;
// Bumped batches so client-filtered pagination has enough rows to fill multiple pages.
// Visa filter typically keeps ~30-40% of jobs → 400 raw ≈ ~7-8 pages.
// Entry-level filter typically keeps ~50% → 300 raw ≈ ~7 pages.
const ENTRY_LEVEL_BATCH_SIZE = 300;
const VISA_BATCH_SIZE = 400;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const PERSONALIZED_STALE_TIME = 60 * 60 * 1000; // 1 hour cache per profile

function getUpdatedTime(job: Job): number {
  const updated = job.updated_at instanceof Date ? job.updated_at : new Date(job.updated_at as any);
  const posted = job.posted_date instanceof Date ? job.posted_date : new Date(job.posted_date as any);
  return updated.getTime() || posted.getTime() || 0;
}

function parseJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    company_logo: row.company_logo,
    location: row.location,
    description: row.description,
    skills: row.skills || [],
    external_apply_link: row.external_apply_link,
    is_published: row.is_published,
    is_reviewing: row.is_reviewing,
    salary_range: row.salary_range,
    employment_type: row.employment_type || "Full Time",
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    is_archived: row.is_archived,
    description_enriched: row.description_enriched ?? false,
    description_source: row.description_source ?? null,
  };
}

type FilterTab = "all" | "today" | "yesterday" | "week";

interface UseJobSearchPaginatedOptions {
  searchQuery: string;
  page: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  visaFilter?: VisaFilter;
  filterTab?: FilterTab;
}

async function fetchJobsPage(
  searchQuery: string,
  page: number,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  visaFilter: VisaFilter,
  filterTab: FilterTab,
  signal?: AbortSignal,
) {
  const trimmed = searchQuery.trim();
  const entryLevel = hasEntryLevelIntent(trimmed);
  const effectiveQuery = entryLevel ? stripEntryLevelKeywords(trimmed) : trimmed;
  const isVisaFiltered = visaFilter !== "all";
  const needsClientFilter = isVisaFiltered || entryLevel;
  const shouldOverfetchFirstPage = !needsClientFilter && page === 1;
  let allJobs: Job[] = [];

  if (effectiveQuery || trimmed) {
    const queryForDb = (effectiveQuery || trimmed).trim();
    const fetchSize = needsClientFilter
      ? (isVisaFiltered ? VISA_BATCH_SIZE : ENTRY_LEVEL_BATCH_SIZE)
      : (shouldOverfetchFirstPage ? FIRST_PAGE_OVERFETCH_SIZE : PAGE_SIZE);
    const rangeStart = needsClientFilter ? 0 : (page - 1) * PAGE_SIZE;
    const rangeEnd = rangeStart + fetchSize - 1;

    // Title-only match: any job whose title contains the query phrase.
    let q = supabase
      .from("jobs")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .eq("is_direct_apply", true)
      .is("deleted_at", null)
      .ilike("title", `%${queryForDb}%`)
      .order("updated_at", { ascending: false })
      .range(rangeStart, rangeEnd);

    if (dateFrom) q = q.gte("posted_date", dateFrom);
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      q = q.lt("posted_date", toDate.toISOString().split("T")[0]);
    }

    if (signal) q = q.abortSignal(signal);

    const { data, error } = await q;
    if (error) throw error;
    allJobs = (data || []).map(parseJob);
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);

    const fetchSize = needsClientFilter
      ? (isVisaFiltered ? VISA_BATCH_SIZE : ENTRY_LEVEL_BATCH_SIZE)
      : (shouldOverfetchFirstPage ? FIRST_PAGE_OVERFETCH_SIZE : PAGE_SIZE);
    const rangeStart = needsClientFilter ? 0 : (page - 1) * PAGE_SIZE;
    const rangeEnd = rangeStart + fetchSize - 1;

    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .eq("is_archived", false)
      .eq("is_direct_apply", true)
      .is("deleted_at", null)
      .gte("posted_date", cutoff.toISOString())
      .order("posted_date", { ascending: false })
      .range(rangeStart, rangeEnd);

    if (dateFrom) query = query.gte("posted_date", dateFrom);
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      query = query.lt("posted_date", toDate.toISOString().split("T")[0]);
    }

    if (signal) {
      query = query.abortSignal(signal);
    }

    const { data, error } = await query;
    if (error) throw error;
    allJobs = (data || []).map(parseJob);
  }

  let filteredJobs = enrichJobList(allJobs, entryLevel);
  if (isVisaFiltered) {
    filteredJobs = filterJobsByVisa(filteredJobs, visaFilter);
  }

  if (needsClientFilter) {
    const totalFiltered = filteredJobs.length;
    const startIdx = (page - 1) * PAGE_SIZE;
    const pageJobs = filteredJobs.slice(startIdx, startIdx + PAGE_SIZE);
    return { jobs: pageJobs, visaFilteredCount: totalFiltered };
  }

  if (shouldOverfetchFirstPage) {
    return { jobs: filteredJobs.slice(0, PAGE_SIZE) };
  }

  return { jobs: filteredJobs };
}

async function fetchPersonalizedPool(
  searchQuery: string,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  filterTab: FilterTab,
  signal?: AbortSignal,
): Promise<Job[]> {
  const trimmed = searchQuery.trim();
  let allJobs: Job[] = [];

  if (trimmed) {
    let q = supabase
      .from("jobs")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .eq("is_direct_apply", true)
      .is("deleted_at", null)
      .ilike("title", `%${trimmed}%`)
      .order("updated_at", { ascending: false })
      .range(0, PERSONALIZED_POOL_SIZE - 1);
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw error;
    allJobs = (data || []).map(parseJob);
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);
    let q = supabase
      .from("jobs")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .eq("is_direct_apply", true)
      .is("deleted_at", null)
      .gte("posted_date", cutoff.toISOString())
      .order("posted_date", { ascending: false })
      .range(0, PERSONALIZED_POOL_SIZE - 1);

    if (filterTab !== "all") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (filterTab === "today") {
        q = q.gte("posted_date", todayStart.toISOString());
      } else if (filterTab === "yesterday") {
        const y = new Date(todayStart); y.setDate(y.getDate() - 1);
        q = q.gte("posted_date", y.toISOString()).lt("posted_date", todayStart.toISOString());
      } else if (filterTab === "week") {
        const w = new Date(todayStart); w.setDate(w.getDate() - 7);
        const y = new Date(todayStart); y.setDate(y.getDate() - 1);
        q = q.gte("posted_date", w.toISOString()).lt("posted_date", y.toISOString());
      }
    }

    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw error;
    allJobs = (data || []).map(parseJob);
  }

  if (dateFrom || dateTo) {
    allJobs = allJobs.filter(j => {
      if (dateFrom && j.posted_date < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        if (j.posted_date >= to) return false;
      }
      return true;
    });
  }

  return enrichJobList(allJobs, false);
}

export function useJobSearchPaginated({ searchQuery, page, dateFrom, dateTo, visaFilter = "all", filterTab = "all" }: UseJobSearchPaginatedOptions) {
  const queryClient = useQueryClient();
  const isVisaFiltered = visaFilter !== "all";
  const entryLevel = hasEntryLevelIntent(searchQuery);
  const needsClientFilter = isVisaFiltered || entryLevel;
  const debouncedCountSearch = useDebounce(searchQuery, 450);

  // Personalization: if the user has any profile signal (skills/title/work/resume),
  // re-rank the candidate pool by match score (skills 50% / title 30% / experience 20%),
  // tiebreak by recency within ±10 points, and push applied/saved to the bottom.
  const { profile } = useProfile();
  const { data: excludeIds } = useAppliedSavedJobIds();

  const personalIntelligence = useMemo<ResumeIntelligence | null>(() => {
    if (!profile) return null;
    const stored = (profile.resume_intelligence as ResumeIntelligence | null) || null;
    return stored ?? buildProfileFallbackIntelligence(profile);
  }, [profile]);

  const profileFingerprint = useMemo(() => {
    if (!personalIntelligence) return null;
    return [
      personalIntelligence.primaryRole || "",
      (personalIntelligence.topSkills || []).slice(0, 8).join(","),
      personalIntelligence.experienceLevel || "",
      personalIntelligence.yearsOfExperience ?? "",
    ].join("|");
  }, [personalIntelligence]);

  // Personalize when we have profile data OR an active search query, AND no client-side
  // post-filter is active (visa / entry-level paths overfetch + slice differently).
  // Search queries are always sorted by latest updated time first (no scoring re-rank).
  const hasSearchQuery = !!searchQuery.trim();
  const personalize = (!!personalIntelligence || hasSearchQuery) && !needsClientFilter;

  // Cancel stale in-flight queries when search changes (not on unmount)
  const prevSearchRef = useRef(searchQuery);
  useEffect(() => {
    if (prevSearchRef.current !== searchQuery) {
      queryClient.cancelQueries({ queryKey: ["jobs", "paginated", prevSearchRef.current] });
      queryClient.cancelQueries({ queryKey: ["jobs", "personalized", prevSearchRef.current] });
      prevSearchRef.current = searchQuery;
    }
  }, [searchQuery, queryClient]);

  // ---------- Personalized branch ----------
  const personalizedQuery = useQuery({
    queryKey: ["jobs", "personalized", searchQuery, dateFrom, dateTo, filterTab, profileFingerprint],
    queryFn: async ({ signal }) => {
      const pool = await fetchPersonalizedPool(searchQuery, dateFrom, dateTo, filterTab, signal);

      // When the user is actively searching, sort strictly by latest updated time
      // (most recently updated jobs first). This treats title variants like
      // "Software Engineer", "Software Engineer 1", "Software Engineer I",
      // "Junior Software Engineer" equally — they all match by title only,
      // and ordering is purely by recency of update.
      if (hasSearchQuery) {
        return [...pool].sort((a, b) => getUpdatedTime(b) - getUpdatedTime(a));
      }

      if (!personalIntelligence) return pool;

      const scored = pool.map((j) => {
        const m = calculateJobMatch(j, personalIntelligence);
        return { job: j, score: m.score };
      });

      // Match score desc; within 10pt window, prefer recency
      scored.sort((a, b) => {
        const diff = b.score - a.score;
        if (Math.abs(diff) >= 10) return diff;
        return b.job.posted_date.getTime() - a.job.posted_date.getTime();
      });

      // Push applied/saved to bottom (preserve their relative order)
      const top: typeof scored = [];
      const bottom: typeof scored = [];
      for (const s of scored) {
        if (excludeIds?.has(s.job.id)) bottom.push(s);
        else top.push(s);
      }
      return [...top, ...bottom].map((s) => s.job);
    },
    enabled: personalize,
    staleTime: PERSONALIZED_STALE_TIME,
    gcTime: PERSONALIZED_STALE_TIME,
    placeholderData: (prev) => prev,
  });

  // ---------- Default (non-personalized) branch ----------
  const jobsQuery = useQuery({
    queryKey: ["jobs", "paginated", searchQuery, page, dateFrom, dateTo, visaFilter, filterTab],
    queryFn: ({ signal }) => fetchJobsPage(searchQuery, page, dateFrom, dateTo, visaFilter, filterTab, signal),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
    enabled: !personalize,
  });

  // Prefetch next page in background for instant navigation (default branch only)
  useEffect(() => {
    if (!personalize && !needsClientFilter && jobsQuery.data && jobsQuery.data.jobs.length === PAGE_SIZE) {
      const nextPage = page + 1;
      queryClient.prefetchQuery({
        queryKey: ["jobs", "paginated", searchQuery, nextPage, dateFrom, dateTo, visaFilter, filterTab],
        queryFn: () => fetchJobsPage(searchQuery, nextPage, dateFrom, dateTo, visaFilter, filterTab),
        staleTime: STALE_TIME,
      });
    }
  }, [queryClient, searchQuery, page, dateFrom, dateTo, visaFilter, filterTab, needsClientFilter, personalize, jobsQuery.data]);

  const countQuery = useQuery({
    queryKey: ["jobs", "count", debouncedCountSearch, filterTab],
    queryFn: async ({ signal }) => {
      const trimmed = debouncedCountSearch.trim();
      if (trimmed) {
        const effectiveQ = hasEntryLevelIntent(trimmed) ? stripEntryLevelKeywords(trimmed) : trimmed;
        const queryForDb = (effectiveQ || trimmed).trim();
        let cq = supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .eq("is_archived", false)
          .eq("is_direct_apply", true)
          .is("deleted_at", null)
          .ilike("title", `%${queryForDb}%`);
        if (signal) cq = cq.abortSignal(signal);
        const { count, error } = await cq;
        if (error) throw error;
        return count || 0;
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);
      let baseCountQuery = supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("is_archived", false)
        .eq("is_direct_apply", true)
        .is("deleted_at", null)
        .gte("posted_date", cutoff.toISOString());

      // Apply server-side date tab when no search query
      if (filterTab !== "all") {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (filterTab === "today") {
          baseCountQuery = baseCountQuery.gte("posted_date", todayStart.toISOString());
        } else if (filterTab === "yesterday") {
          const y = new Date(todayStart); y.setDate(y.getDate() - 1);
          baseCountQuery = baseCountQuery.gte("posted_date", y.toISOString()).lt("posted_date", todayStart.toISOString());
        } else if (filterTab === "week") {
          const w = new Date(todayStart); w.setDate(w.getDate() - 7);
          const y = new Date(todayStart); y.setDate(y.getDate() - 1);
          baseCountQuery = baseCountQuery.gte("posted_date", w.toISOString()).lt("posted_date", y.toISOString());
        }
      }

      if (signal) {
        baseCountQuery = baseCountQuery.abortSignal(signal);
      }

      const { count, error } = await baseCountQuery;
      if (error) throw error;
      return count || 0;
    },
    staleTime: STALE_TIME,
    enabled: !needsClientFilter,
  });

  // For pages beyond the personalized pool, fall back to the default newest-first fetch.
  const personalizedMaxPage = Math.ceil(PERSONALIZED_POOL_SIZE / PAGE_SIZE);
  const personalizedFallbackQuery = useQuery({
    queryKey: ["jobs", "paginated", searchQuery, page, dateFrom, dateTo, visaFilter, filterTab],
    queryFn: ({ signal }) => fetchJobsPage(searchQuery, page, dateFrom, dateTo, visaFilter, filterTab, signal),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
    enabled: personalize && page > personalizedMaxPage,
  });

  // ---------- Assemble final result ----------
  if (personalize) {
    const all = personalizedQuery.data || [];
    const totalCount = countQuery.data ?? all.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    let pageJobs: Job[];
    if (page > personalizedMaxPage) {
      pageJobs = personalizedFallbackQuery.data?.jobs || [];
    } else {
      const start = (page - 1) * PAGE_SIZE;
      pageJobs = all.slice(start, start + PAGE_SIZE);
    }
    return {
      data: {
        jobs: pageJobs,
        totalCount,
        totalPages,
      },
      isLoading: personalizedQuery.isLoading || personalizedFallbackQuery.isLoading,
      isFetching: personalizedQuery.isFetching || personalizedFallbackQuery.isFetching,
    };
  }

  const clientFilteredCount = (jobsQuery.data as any)?.visaFilteredCount;
  const rawTotalCount = needsClientFilter
    ? (clientFilteredCount ?? 0)
    : (countQuery.data ?? 0);

  const totalCount = rawTotalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    data: {
      jobs: jobsQuery.data?.jobs || [],
      totalCount,
      totalPages,
    },
    isLoading: jobsQuery.isLoading,
    isFetching: jobsQuery.isFetching,
  };
}
