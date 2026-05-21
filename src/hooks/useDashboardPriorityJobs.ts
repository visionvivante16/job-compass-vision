import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/types/job";
import { shouldExcludeJob } from "@/lib/jobFilters";

export const DASHBOARD_PAGE_SIZE = 20;
const OVERFETCH_BUFFER = DASHBOARD_PAGE_SIZE;

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

interface UseDashboardPriorityJobsOptions {
  currentPage: number;
  enabled: boolean;
  priorityJobs: Job[];
}

export function useDashboardPriorityJobs({
  currentPage,
  enabled,
  priorityJobs,
}: UseDashboardPriorityJobsOptions) {
  const priorityFingerprint = useMemo(
    () => priorityJobs.map((job) => job.id).join("|"),
    [priorityJobs]
  );

  return useQuery({
    queryKey: ["dashboard-priority-jobs", currentPage, priorityFingerprint],
    enabled,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
    queryFn: async (): Promise<Job[]> => {
      const pageStart = (currentPage - 1) * DASHBOARD_PAGE_SIZE;
      const priorityPageJobs = priorityJobs.slice(pageStart, pageStart + DASHBOARD_PAGE_SIZE);
      const remainingSlots = DASHBOARD_PAGE_SIZE - priorityPageJobs.length;

      if (remainingSlots <= 0) {
        return priorityPageJobs;
      }

      const priorityIds = new Set(priorityJobs.map((job) => job.id));
      let genericSkip = Math.max(0, pageStart - priorityJobs.length);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 10);
      let scanOffset = 0;
      const genericJobs: Job[] = [];

      while (genericJobs.length < remainingSlots) {
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("is_published", true)
          .eq("is_archived", false)
          .is("deleted_at", null)
          .gte("posted_date", cutoff.toISOString())
          .order("posted_date", { ascending: false })
          .range(scanOffset, scanOffset + priorityIds.size + OVERFETCH_BUFFER - 1);

        if (error) throw error;
        if (!data?.length) break;

        const batch = data
          .map(parseJob)
          .filter((job) => !priorityIds.has(job.id) && !shouldExcludeJob(job));

        if (genericSkip >= batch.length) {
          genericSkip -= batch.length;
        } else {
          const startIndex = Math.max(0, genericSkip);
          genericJobs.push(...batch.slice(startIndex, startIndex + remainingSlots - genericJobs.length));
          genericSkip = 0;
        }

        scanOffset += priorityIds.size + OVERFETCH_BUFFER;
      }

      return [...priorityPageJobs, ...genericJobs];
    },
  });
}