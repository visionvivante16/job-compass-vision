import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HiringGraphEntry {
  id: string;
  role_name: string;
  percentage: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface HiringGraphPublished {
  id: string;
  role_name: string;
  percentage: number;
  sort_order: number;
  created_at: string;
  published_at: string;
  published_by: string | null;
}

export interface HiringGraphInsert {
  role_name: string;
  percentage: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface HiringGraphUpdate {
  id: string;
  role_name?: string;
  percentage?: number;
  sort_order?: number;
  is_active?: boolean;
}

// Fetch all draft data (founder only)
export function useHiringGraphData() {
  return useQuery({
    queryKey: ["hiring-graph-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_graph_data")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as HiringGraphEntry[];
    },
    staleTime: 30 * 1000,
  });
}

// Fetch published data for public display (what users see on dashboard)
export function usePublishedHiringGraphData() {
  return useQuery({
    queryKey: ["hiring-graph-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_graph_published")
        .select("*")
        .order("sort_order", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as HiringGraphPublished[];
    },
    staleTime: 30 * 1000,
  });
}

// Add a new draft entry
export function useAddHiringGraphEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: HiringGraphInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("hiring_graph_data")
        .insert({
          ...entry,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiring-graph-data"] });
      toast.success("Role added to draft");
    },
    onError: (error: Error) => {
      console.error("Failed to add graph entry:", error);
      toast.error("Failed to add role: " + error.message);
    },
  });
}

// Update a draft entry
export function useUpdateHiringGraphEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: HiringGraphUpdate) => {
      const { data, error } = await supabase
        .from("hiring_graph_data")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiring-graph-data"] });
      toast.success("Draft updated");
    },
    onError: (error: Error) => {
      console.error("Failed to update graph entry:", error);
      toast.error("Failed to update role: " + error.message);
    },
  });
}

// Delete a draft entry
export function useDeleteHiringGraphEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hiring_graph_data")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiring-graph-data"] });
      toast.success("Role deleted from draft");
    },
    onError: (error: Error) => {
      console.error("Failed to delete graph entry:", error);
      toast.error("Failed to delete role: " + error.message);
    },
  });
}

// Bulk update sort order
export function useReorderHiringGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: { id: string; sort_order: number }[]) => {
      const promises = entries.map(({ id, sort_order }) =>
        supabase
          .from("hiring_graph_data")
          .update({ sort_order })
          .eq("id", id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error("Failed to reorder some entries");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiring-graph-data"] });
      toast.success("Order saved");
    },
    onError: (error: Error) => {
      console.error("Failed to reorder graph:", error);
      toast.error("Failed to save order");
    },
  });
}

// Publish the graph - copies active drafts to published table
export function usePublishHiringGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("publish_hiring_graph");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiring-graph-published"] });
      toast.success("Graph published successfully!");
    },
    onError: (error: Error) => {
      console.error("Failed to publish graph:", error);
      toast.error("Failed to publish: " + error.message);
    },
  });
}
