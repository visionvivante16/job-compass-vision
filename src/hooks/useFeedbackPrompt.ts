import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type FeedbackTrigger = "apply" | "ats" | "cover_letter";

const LS_KEY_GIVEN = "sociax_feedback_given";
const SS_KEY_APPLY_COUNT = "sociax_apply_click_count";
const APPLY_THRESHOLD = 3;

// Simple event bus for cross-module triggering without prop drilling
type Listener = (trigger: FeedbackTrigger) => void;
const listeners = new Set<Listener>();

export function triggerFeedbackPrompt(trigger: FeedbackTrigger) {
  // Skip if already given (cheap localStorage check)
  if (typeof window !== "undefined" && localStorage.getItem(LS_KEY_GIVEN) === "1") return;
  listeners.forEach((fn) => fn(trigger));
}

/** Call on every Apply click — fires popup on the 3rd click in this session */
export function trackApplyClickForFeedback() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LS_KEY_GIVEN) === "1") return;
  const current = parseInt(sessionStorage.getItem(SS_KEY_APPLY_COUNT) || "0", 10);
  const next = current + 1;
  sessionStorage.setItem(SS_KEY_APPLY_COUNT, String(next));
  if (next === APPLY_THRESHOLD) {
    triggerFeedbackPrompt("apply");
  }
}

/** Schedule popup 5s after a feature completes */
export function scheduleFeedbackPrompt(trigger: FeedbackTrigger, delayMs = 5000) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LS_KEY_GIVEN) === "1") return;
  setTimeout(() => triggerFeedbackPrompt(trigger), delayMs);
}

/** Hook used by the global FeedbackPopup component */
export function useFeedbackPrompt() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTrigger, setActiveTrigger] = useState<FeedbackTrigger | null>(null);
  const dbCheckedRef = useRef(false);

  // On user load, sync DB state into localStorage
  useEffect(() => {
    if (!user || dbCheckedRef.current) return;
    dbCheckedRef.current = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("feedback_given_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.feedback_given_at) {
        localStorage.setItem(LS_KEY_GIVEN, "1");
      }
    })();
  }, [user]);

  // Subscribe to global trigger events
  useEffect(() => {
    const listener: Listener = (trigger) => {
      // Double-check guard (in case storage was set between trigger and listener)
      if (localStorage.getItem(LS_KEY_GIVEN) === "1") return;
      if (!user) return; // Only show for authenticated users
      setActiveTrigger(trigger);
      setIsOpen(true);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [user]);

  const markGiven = useCallback(async () => {
    localStorage.setItem(LS_KEY_GIVEN, "1");
    if (user) {
      await supabase
        .from("profiles")
        .update({ feedback_given_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    }
  }, [user]);

  const submit = useCallback(
    async (rating: number, comment: string) => {
      if (!user || !activeTrigger) return;
      const { error } = await supabase.from("feature_feedback").insert({
        user_id: user.id,
        trigger_source: activeTrigger,
        rating,
        comment: comment.trim() || null,
      } as any);
      if (error) throw error;
      await markGiven();
      setIsOpen(false);
      setActiveTrigger(null);
    },
    [user, activeTrigger, markGiven],
  );

  const dismiss = useCallback(async () => {
    // Closing without submitting also marks as given (per spec: "only show ONCE")
    await markGiven();
    setIsOpen(false);
    setActiveTrigger(null);
  }, [markGiven]);

  return { isOpen, activeTrigger, submit, dismiss };
}
