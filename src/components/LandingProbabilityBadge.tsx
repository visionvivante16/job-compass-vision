import { LandingProbabilityResult } from "@/lib/landingProbability";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Target } from "lucide-react";

interface LandingProbabilityBadgeProps {
  result: LandingProbabilityResult;
  compact?: boolean;
}

export function LandingProbabilityBadge({ result, compact = false }: LandingProbabilityBadgeProps) {
  const getBgColor = () => {
    if (result.probability >= 80) return "bg-success/10 text-success border-success/20";
    if (result.probability >= 60) return "bg-primary/10 text-primary border-primary/20";
    if (result.probability >= 40) return "bg-warning/10 text-warning border-warning/20";
    return "bg-muted text-muted-foreground border-border/40";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums border ${getBgColor()} whitespace-nowrap`}>
            <Target className="h-3 w-3" />
            {compact ? `${result.probability}%` : `🎯 ${result.probability}% Landing`}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={10} className="z-[9999] text-xs max-w-[260px] p-3">
          <p className="font-semibold mb-2">🎯 Landing Probability: {result.probability}%</p>
          <div className="space-y-1">
            {result.breakdown.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="shrink-0">
                  {item.status === "positive" ? "✅" : item.status === "warning" ? "⚠️" : "❌"}
                </span>
                <span className="flex-1">{item.label}: {item.detail}</span>
                <span className={`shrink-0 font-medium ${item.impact.startsWith("-") ? "text-destructive" : "text-success"}`}>
                  ({item.impact})
                </span>
              </div>
            ))}
          </div>
          <p className={`mt-2 pt-2 border-t border-border/50 font-medium ${result.color}`}>
            {result.message}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
