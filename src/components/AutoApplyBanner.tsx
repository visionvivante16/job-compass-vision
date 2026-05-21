import { motion } from "framer-motion";

export function AutoApplyBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-xl p-[2px] overflow-hidden"
      style={{
        background: "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--primary)), hsl(217 91% 60%), hsl(var(--accent)))",
        backgroundSize: "300% 100%",
        animation: "border-flow 3s linear infinite",
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] bg-card">
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          Auto Apply Coming Soon
        </span>
        <span className="hidden sm:inline text-sm text-muted-foreground">
          We'll apply to jobs for you automatically
        </span>
      </div>
    </motion.div>
  );
}
