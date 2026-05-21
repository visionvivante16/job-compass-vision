import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  message: string;
  stack: string | null;
  page_url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useErrorLogs(filters?: { error_type?: string; limit?: number }) {
  return useQuery({
    queryKey: ["error-logs", filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 100);

      if (filters?.error_type && filters.error_type !== "all") {
        query = query.eq("error_type", filters.error_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ErrorLog[];
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useClearErrorLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("error_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["error-logs"] }),
  });
}

export function useDeleteErrorLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("error_logs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["error-logs"] }),
  });
}
