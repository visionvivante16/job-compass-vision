import { LandingProbabilityResult } from "@/lib/landingProbability";
import { Target, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LandingProbabilityPanelProps {
  result: LandingProbabilityResult;
}

export function LandingProbabilityPanel({ result }: LandingProbabilityPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const getBarColor = () => {
    if (result.probability >= 80) return "bg-success";
    if (result.probability >= 60) return "bg-primary";
    if (result.probability >= 40) return "bg-warning";
    return "bg-muted-foreground";
  };

  return (
    <div className="border border-border/40 rounded-xl p-4 bg-secondary/30 mb-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Target className={`h-5 w-5 ${result.color}`} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Landing Probability: <span className={result.color}>{result.probability}%</span>
            </p>
            <p className={`text-xs ${result.color} font-medium`}>{result.message}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${result.probability}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${getBarColor()}`}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
              {result.breakdown.map((item, i) => {
                const Icon = item.status === "positive" ? CheckCircle2 : item.status === "warning" ? AlertCircle : XCircle;
                const iconColor = item.status === "positive" ? "text-success" : item.status === "warning" ? "text-warning" : "text-destructive";
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="flex-1">
                      <span className="font-medium text-foreground">{item.label}:</span>{" "}
                      <span className="text-muted-foreground">{item.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
