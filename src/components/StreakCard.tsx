import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useUserStreak } from "@/hooks/useRetention";

export function StreakCard() {
  const { streak } = useUserStreak();
  if (!streak || streak.current_streak < 1) return null;

  const count = streak.current_streak;
  const message =
    count === 1
      ? "You started a streak today — come back tomorrow!"
      : `You've checked jobs ${count} days in a row`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 text-sm"
    >
      <Flame className="h-4 w-4 text-orange-500" />
      <span className="font-semibold text-orange-600 dark:text-orange-400">
        {count} day streak
      </span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        — {message}
      </span>
    </motion.div>
  );
}
