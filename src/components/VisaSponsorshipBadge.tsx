import { VisaSponsorshipResult } from "@/lib/visaSponsorship";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VisaSponsorshipBadgeProps {
  result: VisaSponsorshipResult;
  compact?: boolean;
}

export function VisaSponsorshipBadge({ result, compact = false }: VisaSponsorshipBadgeProps) {
  if (result.status === "unknown" && compact) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${result.badgeClass} whitespace-nowrap`}
          >
            {compact ? result.emoji : result.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[220px]">
          <p className="font-medium mb-1">{result.label}</p>
          {result.visaTypes.length > 0 && (
            <p className="text-muted-foreground">Visa types: {result.visaTypes.join(", ")}</p>
          )}
          <p className="text-muted-foreground">Confidence: {result.confidence}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
