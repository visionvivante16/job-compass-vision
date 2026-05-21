import { VisaFilter } from "@/lib/visaSponsorship";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VisaFilterPillsProps {
  value: VisaFilter;
  onChange: (filter: VisaFilter) => void;
}

const filterConfig: {
  value: VisaFilter;
  label: string;
  activeDotClass: string;
  activeTextClass: string;
  activeBgClass: string;
  activeBorderClass: string;
  activeShadow: string;
  pulseDot?: boolean;
}[] = [
  {
    value: "all",
    label: "All Visa-Friendly",
    activeDotClass: "bg-accent",
    activeTextClass: "text-accent",
    activeBgClass: "bg-accent/10",
    activeBorderClass: "border-accent/30",
    activeShadow: "0 2px 10px hsl(var(--accent) / 0.12)",
  },
  {
    value: "h1b",
    label: "H1B Sponsorship",
    activeDotClass: "bg-emerald-500",
    activeTextClass: "text-emerald-700 dark:text-emerald-400",
    activeBgClass: "bg-emerald-500/10",
    activeBorderClass: "border-emerald-500/30",
    activeShadow: "0 2px 10px rgb(16 185 129 / 0.14)",
  },
  {
    value: "opt",
    label: "OPT / STEM OPT",
    activeDotClass: "bg-indigo-500",
    activeTextClass: "text-indigo-700 dark:text-indigo-300",
    activeBgClass: "bg-indigo-500/10",
    activeBorderClass: "border-indigo-500/30",
    activeShadow: "0 2px 10px rgb(99 102 241 / 0.16)",
    pulseDot: true,
  },
];

export function VisaFilterPills({ value, onChange }: VisaFilterPillsProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-card/40 backdrop-blur-md border border-border/60 shadow-sm overflow-x-auto scrollbar-hide">
      <span className="hidden sm:inline-block px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Visa Filter
      </span>
      {filterConfig.map((filter) => {
        const isActive = value === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={cn(
              "relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? `${filter.activeTextClass} font-semibold`
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="visa-filter-active-pill"
                className={cn(
                  "absolute inset-0 rounded-full border",
                  filter.activeBgClass,
                  filter.activeBorderClass
                )}
                style={{ boxShadow: filter.activeShadow }}
                transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.7 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 w-1.5 h-1.5 rounded-full transition-colors",
                isActive ? filter.activeDotClass : "bg-muted-foreground/40",
                isActive && filter.pulseDot && "animate-pulse"
              )}
            />
            <span className="relative z-10">{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
}
