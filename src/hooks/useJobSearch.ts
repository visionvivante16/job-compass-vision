import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job, JobCounts, TabFilter } from "@/types/job";
import { expandSearchTerms } from "@/lib/searchExpansion";
import { enrichJobList } from "@/lib/jobEnrichment";
import { hasEntryLevelIntent, stripEntryLevelKeywords } from "@/lib/jobFilters";

const PAGE_SIZE = 25;
const STALE_TIME = 60 * 1000; // 60 seconds

// Helper to parse job from DB response
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
    employment_type: row.employment_type || 'Full Time',
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    is_archived: row.is_archived,
    description_enriched: row.description_enriched ?? false,
    description_source: row.description_source ?? null,
  };
}

interface UseJobSearchOptions {
  searchQuery: string;
  tab: TabFilter;
  enabled?: boolean;
}

export function useJobSearch({ searchQuery, tab, enabled = true }: UseJobSearchOptions) {
  const entryLevel = hasEntryLevelIntent(searchQuery);
  // Strip entry-level keywords so DB search focuses on the role
  const effectiveQuery = entryLevel ? stripEntryLevelKeywords(searchQuery) : searchQuery;

  return useInfiniteQuery({
    queryKey: ["jobs", "search", searchQuery, tab],
    queryFn: async ({ pageParam = 0 }) => {
      const expandedTerms = expandSearchTerms(effectiveQuery);
      const { data, error } = await supabase.rpc("search_jobs", {
        search_query: effectiveQuery || null,
        page_size: PAGE_SIZE,
        page_offset: pageParam,
        filter_tab: tab,
        expanded_terms: expandedTerms.length > 0 ? expandedTerms : undefined,
      });

      if (error) throw error;
      return enrichJobList((data || []).map(parseJob), entryLevel);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    staleTime: STALE_TIME,
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useJobCounts(searchQuery: string) {
  return useQuery({
    queryKey: ["jobs", "counts", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_job_counts", {
        search_query: searchQuery || null,
      });

      if (error) throw error;
      
      // RPC returns array with single row
      const row = data?.[0] || { total_count: 0, today_count: 0, yesterday_count: 0, week_count: 0 };
      return {
        total_count: Number(row.total_count),
        today_count: Number(row.today_count),
        yesterday_count: Number(row.yesterday_count),
        week_count: Number(row.week_count),
      } as JobCounts;
    },
    staleTime: STALE_TIME,
  });
}
