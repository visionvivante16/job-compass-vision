import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useRemoveDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("remove_duplicate_jobs");
      if (error) throw error;
      return data as { removed: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      if (data.removed > 0) {
        toast.success(`Removed ${data.removed} duplicate jobs from the database.`);
      } else {
        toast.info("No duplicate jobs found in the database.");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to remove duplicates: " + error.message);
    },
  });
}
