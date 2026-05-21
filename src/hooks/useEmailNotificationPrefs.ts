import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailNotificationPref {
  id: string;
  user_id: string;
  daily_digest_enabled: boolean;
  new_jobs_enabled: boolean;
  matched_jobs_enabled: boolean;
  sponsorship_jobs_enabled: boolean;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Founder: fetch all users' email prefs
export function useAllEmailPrefs() {
  return useQuery({
    queryKey: ["all-email-prefs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_notification_preferences")
        .select("*");
      if (error) throw error;
      return (data || []) as EmailNotificationPref[];
    },
  });
}

// Founder: toggle a user's daily digest
export function useToggleUserDigest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      // Check if pref exists
      const { data: existing } = await supabase
        .from("email_notification_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("email_notification_preferences")
          .update({
            daily_digest_enabled: enabled,
            unsubscribed_at: enabled ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Create pref record — this needs service role since founder is inserting for another user
        // Instead, we'll use an RPC or handle it differently
        // For now, founders can only toggle existing prefs (created on signup)
        throw new Error("No email preferences found for this user. They will be created on next login.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-email-prefs"] });
      toast.success("Email notification preference updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Founder: trigger manual digest send
export function useSendDigestNow() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-daily-digest");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Digest sent to ${data.sent} users (${data.new_jobs} new jobs)`);
    },
    onError: (error) => {
      toast.error("Failed to send digest: " + error.message);
    },
  });
}
