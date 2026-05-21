import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JSearchSeed {
  id: string;
  query: string;
  country: string;
  date_posted: string;
  employment_types: string;
  job_requirements: string | null;
  is_active: boolean;
  sort_order: number;
  last_run_at: string | null;
  last_imported_count: number | null;
}

export interface JSearchRun {
  id: string;
  trigger_type: string;
  total_fetched: number;
  total_imported: number;
  total_skipped: number;
  total_filtered: number;
  duplicates_removed: number;
  duration_ms: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  errors: Array<{ query: string; error: string }> | null;
  details: { per_query?: Array<{ query: string; fetched: number; imported: number }> } | null;
}

export function useJSearchSeeds() {
  return useQuery({
    queryKey: ["jsearch-seeds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jsearch_query_seeds")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as JSearchSeed[];
    },
  });
}

export function useJSearchRuns() {
  return useQuery({
    queryKey: ["jsearch-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jsearch_ingest_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown) as JSearchRun[];
    },
    refetchInterval: 5000,
  });
}

export function useToggleSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("jsearch_query_seeds")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jsearch-seeds"] }),
  });
}

export function useUpdateSeedQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, query }: { id: string; query: string }) => {
      const { error } = await supabase
        .from("jsearch_query_seeds")
        .update({ query })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jsearch-seeds"] }),
  });
}

export function useAddSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (query: string) => {
      const { data: existing } = await supabase
        .from("jsearch_query_seeds")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (existing?.sort_order || 0) + 1;
      const { error } = await supabase
        .from("jsearch_query_seeds")
        .insert({ query, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jsearch-seeds"] });
      toast.success("Query added");
    },
  });
}

export function useDeleteSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jsearch_query_seeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jsearch-seeds"] });
      toast.success("Query removed");
    },
  });
}

export function useRunIngest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seedId?: string) => {
      const { data, error } = await supabase.functions.invoke("ingest-jsearch", {
        body: seedId ? { seed_id: seedId } : {},
      });
      if (error) throw error;
      return data as {
        success: boolean;
        total_fetched: number;
        total_imported: number;
        total_filtered: number;
        total_skipped: number;
        duplicates_removed: number;
        errors: Array<{ query: string; error: string }>;
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["jsearch-runs"] });
      qc.invalidateQueries({ queryKey: ["jsearch-seeds"] });
      toast.success(
        `Imported ${data.total_imported} jobs (${data.total_filtered} filtered, ${data.total_skipped} duplicates)`
      );
    },
    onError: (e: Error) => {
      toast.error(e.message || "Ingest failed");
    },
  });
}
