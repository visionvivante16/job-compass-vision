import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CURATED_ROLE_CATEGORIES,
  DYNAMIC_ROLE_CATEGORIES,
  RoleCategory,
} from "@/lib/roleCategories";

const STALE_TIME = 5 * 60 * 1000;

export interface RoleCategoryCount {
  category: RoleCategory;
  count: number;
}

interface RoleCategoryCountsResult {
  curated: RoleCategoryCount[];
  other: RoleCategoryCount[];
  totalActiveJobs: number;
}

/**
 * Pulls every active job title once (lightweight — title only) and runs the
 * regex matchers locally to compute counts per role category.
 *
 * Cached for 5 minutes so navigating around the dashboard doesn't refetch.
 */
async function fetchRoleCategoryCounts(): Promise<RoleCategoryCountsResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);

  // Fetch in chunks of 1000 to bypass Supabase's default limit and keep the
  // payload small (title is the only column we need).
  const PAGE = 1000;
  let from = 0;
  const titles: string[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("jobs")
      .select("title")
      .eq("is_published", true)
      .eq("is_archived", false)
      .eq("is_direct_apply", true)
      .is("deleted_at", null)
      .gte("posted_date", cutoff.toISOString())
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (row.title) titles.push(row.title);
    }
    if (data.length < PAGE) break;
    from += PAGE;
    // Safety stop — never scan more than ~10k titles for the pill bar.
    if (from >= 10000) break;
  }

  const tally = (cats: RoleCategory[]): RoleCategoryCount[] =>
    cats
      .map((category) => {
        let count = 0;
        for (const t of titles) {
          if (category.pattern.test(t)) count++;
        }
        return { category, count };
      });

  return {
    curated: tally(CURATED_ROLE_CATEGORIES),
    // Only surface dynamic categories that actually have matches today
    other: tally(DYNAMIC_ROLE_CATEGORIES).filter((c) => c.count > 0),
    totalActiveJobs: titles.length,
  };
}

export function useRoleCategoryCounts() {
  return useQuery({
    queryKey: ["role-category-counts"],
    queryFn: fetchRoleCategoryCounts,
    staleTime: STALE_TIME,
  });
}
