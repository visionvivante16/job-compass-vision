import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AtsCompany {
  id: string;
  slug: string;
  company_name: string;
  ats_platform: "greenhouse" | "lever" | "ashby";
  status: "active" | "inactive" | "pending";
  last_checked: string | null;
  jobs_found_last_run: number;
  auto_discovered: boolean;
  date_added: string;
  created_at: string;
  updated_at: string;
  tier: 1 | 2 | 3;
  jobs_last_run: number;
  jobs_last_7days: number;
  consecutive_empty_runs: number;
}

export interface AtsDiscoveryRun {
  id: string;
  trigger_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  total_candidates: number;
  total_validated: number;
  total_added: number;
  total_activated: number;
  total_deactivated: number;
  details: { recently_added?: Array<{ slug: string; platform: string; jobs: number }> } | null;
  errors: Array<{ slug: string; platform: string; error: string }> | null;
}

export interface AtsIngestRun {
  id: string;
  trigger_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  companies_processed: number;
  total_fetched: number;
  total_imported: number;
  total_skipped: number;
  total_filtered: number;
  duplicates_removed: number;
  details: { per_company?: Array<{ slug: string; platform: string; fetched: number; imported: number }> } | null;
  errors: Array<{ slug: string; platform: string; error: string }> | null;
}

export function useAtsCompanies() {
  return useQuery({
    queryKey: ["ats-companies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ats_companies")
        .select("*")
        .order("date_added", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as unknown) as AtsCompany[];
    },
    refetchInterval: 8000,
  });
}

export function useAtsDiscoveryRuns() {
  return useQuery({
    queryKey: ["ats-discovery-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ats_discovery_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown) as AtsDiscoveryRun[];
    },
    refetchInterval: 5000,
  });
}

export function useAtsIngestRuns() {
  return useQuery({
    queryKey: ["ats-ingest-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ats_ingest_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown) as AtsIngestRun[];
    },
    refetchInterval: 5000,
  });
}

export function useRunAtsDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ats-discover", { body: {} });
      if (error) throw error;
      return data as { success: boolean; run_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ats-discovery-runs"] });
      qc.invalidateQueries({ queryKey: ["ats-companies"] });
      toast.success("Discovery started — refreshing in background");
    },
    onError: (e: Error) => toast.error(e.message || "Discovery failed"),
  });
}

export function useRunAtsIngest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { companyId?: string; tier?: 1 | 2 | 3 }) => {
      const body: Record<string, unknown> = {};
      if (input?.companyId) body.company_id = input.companyId;
      if (input?.tier) body.tier = input.tier;
      const { data, error } = await supabase.functions.invoke("ats-ingest", { body });
      if (error) throw error;
      return data as { success: boolean; run_id: string; companies_count?: number };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ats-ingest-runs"] });
      qc.invalidateQueries({ queryKey: ["ats-companies"] });
      const label = vars?.tier ? `Tier ${vars.tier}` : vars?.companyId ? "Single company" : "All active";
      toast.success(`${label} ingest started`);
    },
    onError: (e: Error) => toast.error(e.message || "ATS ingest failed"),
  });
}

export function useUpdateAtsCompanyTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; tier: 1 | 2 | 3 }) => {
      const { error } = await (supabase as any)
        .from("ats_companies")
        .update({ tier: input.tier })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ats-companies"] });
      toast.success("Tier updated");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });
}

export function useAddAtsCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slug: string; company_name: string; ats_platform: "greenhouse" | "lever" | "ashby" }) => {
      const { error } = await (supabase as any).from("ats_companies").insert({
        slug: input.slug.trim().toLowerCase(),
        company_name: input.company_name.trim(),
        ats_platform: input.ats_platform,
        status: "pending",
        auto_discovered: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ats-companies"] });
      toast.success("Company added — run discovery to validate");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add company"),
  });
}

export function useUpdateAtsCompanyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "active" | "inactive" | "pending" }) => {
      const { error } = await (supabase as any)
        .from("ats_companies")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ats-companies"] });
      toast.success("Company updated");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });
}

export function useDeleteAtsCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ats_companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ats-companies"] });
      toast.success("Company removed");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });
}
