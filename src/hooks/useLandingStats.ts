import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LandingStats {
  jobCount: number;
  companyCount: number;
  userCount: number;
}

export function useLandingStats() {
  return useQuery({
    queryKey: ["landing-stats"],
    queryFn: async (): Promise<LandingStats> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);
      const cutoffISO = cutoff.toISOString();

      const [jobRes, companyCountRes, userCountRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .eq("is_archived", false)
          .eq("is_direct_apply", true)
          .is("deleted_at", null)
          .gte("posted_date", cutoffISO),
        supabase.rpc("get_landing_company_count", { days_back: 45 }),
        supabase.rpc("get_public_user_count"),
      ]);

      // console.log("response ====>",jobRes, companyCountRes, userCountRes);

      if (jobRes.error) throw jobRes.error;
      if (companyCountRes.error) throw companyCountRes.error;
      if (userCountRes.error) throw userCountRes.error;

      return {
        jobCount: jobRes.count ?? 0,
        companyCount: companyCountRes.data.total_companies ?? 0,
        userCount: userCountRes.data.total_users ?? 0,
      };
    },
    staleTime: 60 * 1000,
  });
}
