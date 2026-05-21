import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns the set of job IDs the current user has already applied to or saved.
 * Used by the personalized feed to push these jobs to the bottom of the list.
 */
export function useAppliedSavedJobIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["applied-saved-ids", user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!user?.id) return new Set();
      const [{ data: apps }, { data: saved }] = await Promise.all([
        supabase.from("applications").select("job_id").eq("user_id", user.id),
        supabase.from("saved_jobs").select("job_id").eq("user_id", user.id),
      ]);
      const ids = new Set<string>();
      (apps || []).forEach((r: any) => r.job_id && ids.add(r.job_id));
      (saved || []).forEach((r: any) => r.job_id && ids.add(r.job_id));
      return ids;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
