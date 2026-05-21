import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TopHiringRole {
  role_name: string;
  job_count: number;
  percentage: number;
}

export function useTopHiringsAnalysis() {
  return useQuery({
    queryKey: ["top-hirings-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_hiring_roles" as any, {
        max_roles: 5,
      });

      if (error) throw error;
      return (data || []) as TopHiringRole[];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
