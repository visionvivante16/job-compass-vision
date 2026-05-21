import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useProfileCompleteness, useAccountAgeDays } from "@/hooks/useRetention";

const FIELD_LABELS: Record<string, string> = {
  full_name: "Add your full name",
  phone: "Add your phone number",
  location: "Add your location",
  resume: "Upload your resume",
};

const STORAGE_KEY = "sociax_profile_banner_dismissed";

export function ProfileCompletionBanner({ force = false }: { force?: boolean } = {}) {
  const info = useProfileCompleteness();
  const ageDays = useAccountAgeDays();
  const [dismissed, setDismissed] = useState(() => {
    if (force) return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      // Re-show if it's been > 24h since dismissal
      return Date.now() - parseInt(raw, 10) < 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });

  // Always show on /profile if force=true; otherwise day 2+ rule
  if (!info || info.percent >= 100) return null;
  if (!force) {
    if (ageDays === null || ageDays < 1) return null;
    if (dismissed) return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative mb-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 p-4 sm:p-5"
      >
        {!force && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">
                Your profile is {info.percent}% complete
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
              Complete it to unlock job matches and ATS check.
            </p>
            <Progress value={info.percent} className="h-2 mb-2" />
            {info.missing.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {info.missing.slice(0, 3).map((m) => (
                  <li key={m} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                    {FIELD_LABELS[m] ?? m}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!force && (
            <Button asChild size="sm" className="shrink-0">
              <Link to="/profile">
                Complete profile <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
