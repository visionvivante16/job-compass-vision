import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface StreakInfo {
  current_streak: number;
  jobs_viewed_today: number;
  last_active_date: string | null;
}

interface VisitInfo {
  previous_visit_at: string | null;
  new_jobs_count: number;
}

interface CompletenessInfo {
  percent: number;
  missing: string[];
}

/**
 * Records the current visit ONCE per session, returns "new jobs since last visit".
 * Also ensures the user has an email_notification_preferences row (auto-enroll).
 */
export function useUserVisit() {
  const { user } = useAuth();
  const [visit, setVisit] = useState<VisitInfo | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!user || recordedRef.current) return;
    recordedRef.current = true;
    (async () => {
      // Auto-enroll into email digest (idempotent — ignore unique violation)
      try {
        await supabase
          .from("email_notification_preferences")
          .insert({ user_id: user.id });
      } catch {
        /* row already exists */
      }

      const { data, error } = await supabase.rpc("record_user_visit", {
        p_user_id: user.id,
      });
      if (!error && data) setVisit(data as unknown as VisitInfo);
    })();
  }, [user]);

  return visit;
}

/**
 * Fetches current streak. Call `incrementJobView` when a user opens a job.
 */
export function useUserStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_streaks")
      .select("current_streak, jobs_viewed_today, last_active_date")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setStreak(data as StreakInfo);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const incrementJobView = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("update_user_streak", {
      p_user_id: user.id,
    });
    if (!error && data) setStreak(data as unknown as StreakInfo);
  }, [user]);

  return { streak, incrementJobView, refresh };
}

/**
 * Profile completeness — server computed.
 */
export function useProfileCompleteness() {
  const { user } = useAuth();
  const [info, setInfo] = useState<CompletenessInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("profile_completeness", {
        p_user_id: user.id,
      });
      if (!error && data) setInfo(data as unknown as CompletenessInfo);
    })();
  }, [user]);

  return info;
}

/**
 * Returns true if the user signed up at least 24h ago (so we don't nag day-1 users).
 */
export function useAccountAgeDays(): number | null {
  const { user } = useAuth();
  if (!user?.created_at) return null;
  const diffMs = Date.now() - new Date(user.created_at).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
