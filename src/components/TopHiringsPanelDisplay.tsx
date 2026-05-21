import { useTopHiringsAnalysis } from "@/hooks/useTopHiringsAnalysis";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BAR_COLORS = [
  { start: "hsl(221, 83%, 53%)", end: "hsl(221, 83%, 63%)", glow: "hsl(221, 83%, 53% / 0.4)" },
  { start: "hsl(262, 83%, 55%)", end: "hsl(262, 83%, 68%)", glow: "hsl(262, 83%, 58% / 0.4)" },
  { start: "hsl(199, 89%, 45%)", end: "hsl(199, 89%, 58%)", glow: "hsl(199, 89%, 48% / 0.4)" },
  { start: "hsl(160, 84%, 36%)", end: "hsl(160, 84%, 48%)", glow: "hsl(160, 84%, 39% / 0.4)" },
  { start: "hsl(38, 92%, 48%)", end: "hsl(38, 92%, 60%)", glow: "hsl(38, 92%, 50% / 0.4)" },
];

interface TopHiringsPanelDisplayProps {
  onFilterByRole?: (role: string) => void;
}

export function TopHiringsPanelDisplay({ onFilterByRole }: TopHiringsPanelDisplayProps) {
  const { data: entries = [], isLoading } = useTopHiringsAnalysis();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (entries.length > 0 && !isAnimated) {
      const timer = setTimeout(() => setIsAnimated(true), 100);
      return () => clearTimeout(timer);
    }
  }, [entries.length, isAnimated]);

  const chartData = useMemo(() => {
    if (entries.length === 0) return [];
    const maxPercentage = Math.max(...entries.map(e => e.percentage));
    return entries.map((entry, index) => ({
      ...entry,
      color: BAR_COLORS[index % BAR_COLORS.length],
      widthPercent: maxPercentage > 0 ? (entry.percentage / maxPercentage) * 100 : 0,
    }));
  }, [entries]);

  const totalJobs = useMemo(() => {
    return entries.reduce((sum, e) => sum + e.job_count, 0);
  }, [entries]);

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-4 w-32 mb-1.5" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-muted/10 border border-border/40 shadow-xl shadow-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.02] to-transparent pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-[15px] tracking-tight whitespace-nowrap">Top Hirings Today</h3>
              <p className="text-xs text-muted-foreground whitespace-nowrap">USA market snapshot</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <TrendingUp className="h-2.5 w-2.5 text-green-600" />
              <span className="text-[9px] font-semibold text-green-600">Live</span>
            </div>
          </div>
        </div>

        {/* Bar Graph or Empty State */}
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-28 w-28 mx-auto mb-4 rounded-full border-4 border-dashed border-muted-foreground/15 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
              <BarChart3 className="h-12 w-12 text-muted-foreground/25" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No hiring data available yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Check back soon for updates</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="space-y-3">
              {chartData.map((entry, index) => {
                const isTop = index === 0;
                const isHovered = hoveredIndex === index;

                return (
                  <Tooltip key={entry.role_name}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onFilterByRole?.(entry.role_name)}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={`w-full text-left transition-all duration-200 rounded-lg py-1.5 px-2 -mx-1 ${
                          isHovered ? 'bg-muted/50 scale-[1.01]' : 'hover:bg-muted/30'
                        } ${isTop ? 'ring-1 ring-primary/20 bg-primary/[0.03]' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs truncate transition-colors ${
                            isTop ? 'font-semibold text-foreground' : 'text-foreground/80'
                          } ${isHovered ? 'text-primary' : ''}`}>
                            {entry.role_name}
                            {isTop && (
                              <span className="ml-1 text-[8px] px-1 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                #1
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[9px] text-muted-foreground/60 tabular-nums">
                              {entry.job_count} jobs
                            </span>
                            <span className={`text-[11px] font-bold tabular-nums ${
                              isTop ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {entry.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: isAnimated ? `${entry.widthPercent}%` : '0%',
                              background: `linear-gradient(90deg, ${entry.color.start}, ${entry.color.end})`,
                              boxShadow: isHovered ? `0 0 8px ${entry.color.glow}` : 'none',
                              transitionDelay: isAnimated ? '0ms' : `${index * 100}ms`,
                            }}
                          />
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      className="bg-popover/95 backdrop-blur-sm border-border/50"
                    >
                      <p className="text-xs">Click to filter by <span className="font-semibold">{entry.role_name}</span></p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Stats line */}
            <div className="text-center mt-3">
              <p className="text-[9px] text-muted-foreground/70">
                Based on <span className="font-semibold text-muted-foreground">{totalJobs.toLocaleString()}</span> categorized listings
              </p>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
