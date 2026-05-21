import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserVisit } from "@/hooks/useRetention";
import { useState, useEffect } from "react";

export function NewJobsBadge() {
  const visit = useUserVisit();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal whenever visit info changes
  useEffect(() => {
    setDismissed(false);
  }, [visit?.previous_visit_at]);

  if (!visit || !visit.previous_visit_at || visit.new_jobs_count < 1 || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => setDismissed(true)}
        className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm hover:bg-primary/20 transition-colors"
        title="Click to dismiss"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-semibold text-primary">
          {visit.new_jobs_count.toLocaleString()} new
        </span>
        <span className="text-xs text-muted-foreground">since your last visit</span>
      </motion.button>
    </AnimatePresence>
  );
}
