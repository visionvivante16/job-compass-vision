import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Loader2, CheckCircle2, Sparkles } from "lucide-react";

const STORAGE_KEY = "sociax_new_user_role_popup_seen";
const ONBOARDING_TS_KEY = "sociax_onboarding_completed_at";
const DELAY_MS = 5 * 60 * 1000; // 5 minutes
// Users created before this date are never eligible
const FEATURE_LAUNCH = new Date("2026-04-07T00:00:00Z").getTime();

export function NewUserRolePopup() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isComplete, isLoading: profileLoading } = useProfileComplete();
  const [visible, setVisible] = useState(false);
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || isMobile || profileLoading) return;

    // Already shown before — bail out
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Hard cutoff: accounts created before feature launch are never eligible
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    if (createdAt < FEATURE_LAUNCH) {
      localStorage.setItem(STORAGE_KEY, "true");
      return;
    }

    // Profile + resume must be complete
    if (!isComplete) {
      return;
    }

    // Profile is complete — record timestamp if not already recorded
    let completedAt = localStorage.getItem(ONBOARDING_TS_KEY);
    if (!completedAt) {
      completedAt = new Date().toISOString();
      localStorage.setItem(ONBOARDING_TS_KEY, completedAt);
    }

    // Calculate remaining wait time
    const elapsed = Date.now() - new Date(completedAt).getTime();
    const remaining = Math.max(DELAY_MS - elapsed, 0);

    timerRef.current = setTimeout(() => {
      // Re-check dismissal flag in case user dismissed via another tab
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    }, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, isMobile, isComplete, profileLoading]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleSubmit = async () => {
    if (!role.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("role_requests" as any).insert({
        user_id: user.id,
        requested_role: role.trim(),
      });
      if (error) throw error;
      setSubmitted(true);
      localStorage.setItem(STORAGE_KEY, "true");
      setTimeout(() => setVisible(false), 5500);
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-[400px] rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-6"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Skip"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-3 py-2"
              >
                <CheckCircle2 className="h-10 w-10 text-accent" />
                <p className="text-sm text-foreground font-medium leading-relaxed">
                  Thanks! Your role will be added and visible in your dashboard within 24 hours.
                </p>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-accent shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Not finding your role? Request it.
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Tell us what role you're looking for and we'll add it for you.
                </p>

                <div className="flex gap-2">
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g., Data Analyst, Software Engineer"
                    className="text-sm h-9 bg-secondary/50 border-border/60"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!role.trim() || submitting}
                    className="h-9 px-4 bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
                  </Button>
                </div>

                <button
                  onClick={dismiss}
                  className="mt-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                >
                  Skip
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
