import { forwardRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  ChevronDown,
  Briefcase,
  Globe2,
  X,
  Check,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoleCategoryCounts } from "@/hooks/useRoleCategoryCounts";
import { getCategoryById } from "@/lib/roleCategories";
import { VisaFilter } from "@/lib/visaSponsorship";

type DateFilter = "all" | "today" | "yesterday" | "custom";

interface DashboardFilterBarProps {
  // Date
  dateFilter: DateFilter;
  customDate: Date | undefined;
  fallbackActive: boolean;
  onDateSelect: (value: DateFilter) => void;
  onCustomDateSelect: (date: Date | undefined) => void;
  onClearCustomDate: () => void;
  // Role category
  categoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  // Visa
  showVisaFilter: boolean;
  visaFilter: VisaFilter;
  onVisaChange: (value: VisaFilter) => void;
  // Clear-all
  hasAnyActiveFilter: boolean;
  onClearAll: () => void;
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
];

const VISA_OPTIONS: {
  value: VisaFilter;
  label: string;
  dotClass: string;
}[] = [
  { value: "all", label: "All visa-friendly", dotClass: "bg-accent" },
  { value: "h1b", label: "H1B sponsorship", dotClass: "bg-emerald-500" },
  { value: "opt", label: "OPT / STEM OPT", dotClass: "bg-indigo-500" },
];

function getDateLabel(filter: DateFilter, customDate: Date | undefined) {
  if (filter === "custom" && customDate) return format(customDate, "MMM d, yyyy");
  if (filter === "today") return "Today";
  if (filter === "yesterday") return "Yesterday";
  return "All time";
}

export function DashboardFilterBar({
  dateFilter,
  customDate,
  fallbackActive,
  onDateSelect,
  onCustomDateSelect,
  onClearCustomDate,
  categoryId,
  onSelectCategory,
  showVisaFilter,
  visaFilter,
  onVisaChange,
  hasAnyActiveFilter,
  onClearAll,
}: DashboardFilterBarProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [visaOpen, setVisaOpen] = useState(false);
  const [roleQuery, setRoleQuery] = useState("");

  const { data: roleData } = useRoleCategoryCounts();

  const allRolePills = useMemo(() => {
    const curated = (roleData?.curated ?? []).filter((c) => c.count > 0);
    const other = roleData?.other ?? [];
    return [...curated, ...other];
  }, [roleData]);

  const totalRoleCount = useMemo(
    () => allRolePills.reduce((sum, p) => sum + p.count, 0),
    [allRolePills]
  );

  const filteredRoles = useMemo(() => {
    if (!roleQuery.trim()) return allRolePills;
    const q = roleQuery.trim().toLowerCase();
    return allRolePills.filter((p) =>
      p.category.label.toLowerCase().includes(q)
    );
  }, [allRolePills, roleQuery]);

  const selectedRole = categoryId ? getCategoryById(categoryId) : null;
  const selectedRoleCount = allRolePills.find(
    (p) => p.category.id === categoryId
  )?.count;

  const dateActive = dateFilter !== "all" || !!customDate || fallbackActive;
  const roleActive = !!categoryId;
  const visaActive = visaFilter !== "all";

  const activeCount =
    (dateActive ? 1 : 0) + (roleActive ? 1 : 0) + (visaActive ? 1 : 0);

  const dateLabel = getDateLabel(dateFilter, customDate);
  const visaSelected =
    VISA_OPTIONS.find((o) => o.value === visaFilter) ?? VISA_OPTIONS[0];

  const handleSelectRole = (id: string | null) => {
    onSelectCategory(id);
    setRoleOpen(false);
    setRoleQuery("");
  };

  return (
    <div
      className="inline-flex items-stretch gap-0 rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 shadow-sm overflow-hidden"
      data-tour="dashboard-filter-bar"
    >
      {/* Label */}
      <div className="hidden md:flex items-center gap-1.5 pl-3 pr-1 border-r border-border/60 text-muted-foreground/80">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          Filters
        </span>
        {activeCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-bold tabular-nums">
            {activeCount}
          </span>
        )}
      </div>

      {/* DATE */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <FilterTrigger
            icon={<CalendarIcon className="h-3.5 w-3.5" />}
            label="Date"
            value={dateLabel}
            active={dateActive}
            open={dateOpen}
            dotClass="bg-amber-500"
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-auto p-3 rounded-2xl shadow-elevated border-border/60 bg-card/95 backdrop-blur-lg"
        >
          <div className="flex flex-col gap-1 mb-2 min-w-[180px]">
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onDateSelect(opt.value);
                  setDateOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                  dateFilter === opt.value && !fallbackActive && !customDate
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <span>{opt.label}</span>
                {dateFilter === opt.value &&
                  !fallbackActive &&
                  !customDate && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-[11px] text-muted-foreground px-2 mb-1 font-medium">
              Pick a date
            </p>
            <Calendar
              mode="single"
              selected={customDate}
              onSelect={(d) => {
                onCustomDateSelect(d);
                if (d) setDateOpen(false);
              }}
              disabled={(date) => date > new Date()}
              className="p-1 pointer-events-auto"
            />
            {customDate && (
              <button
                onClick={() => {
                  onClearCustomDate();
                  setDateOpen(false);
                }}
                className="w-full text-center px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary mt-1"
              >
                Clear date
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px bg-border/60 my-1.5" />

      {/* ROLE */}
      <Popover open={roleOpen} onOpenChange={setRoleOpen}>
        <PopoverTrigger asChild>
          <FilterTrigger
            icon={<Briefcase className="h-3.5 w-3.5" />}
            label="Role"
            value={selectedRole ? selectedRole.label : "All roles"}
            valueBadge={
              selectedRole && selectedRoleCount !== undefined
                ? selectedRoleCount
                : undefined
            }
            active={roleActive}
            open={roleOpen}
            dotClass="bg-sky-500"
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[300px] p-0 rounded-2xl shadow-elevated border-border/60 bg-card/95 backdrop-blur-lg overflow-hidden"
        >
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={roleQuery}
                onChange={(e) => setRoleQuery(e.target.value)}
                placeholder="Search roles…"
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-secondary/60 rounded-lg border border-transparent focus:border-border focus:outline-none placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            <button
              onClick={() => handleSelectRole(null)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                categoryId === null
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {categoryId === null && (
                  <Check className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">All roles</span>
              </span>
              <span
                className={cn(
                  "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                  categoryId === null
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {totalRoleCount}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {filteredRoles.map(({ category, count }) => {
                const isActive = categoryId === category.id;
                return (
                  <motion.button
                    key={category.id}
                    layout
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    onClick={() =>
                      handleSelectRole(isActive ? null : category.id)
                    }
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {isActive && <Check className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{category.label}</span>
                    </span>
                    <span
                      className={cn(
                        "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                        isActive
                          ? "bg-background/20 text-background"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
            {filteredRoles.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No roles match "{roleQuery}"
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* VISA */}
      {showVisaFilter && (
        <>
          <div className="w-px bg-border/60 my-1.5" />
          <Popover open={visaOpen} onOpenChange={setVisaOpen}>
            <PopoverTrigger asChild>
              <FilterTrigger
                icon={<Globe2 className="h-3.5 w-3.5" />}
                label="Visa"
                value={visaSelected.label}
                active={visaActive}
                open={visaOpen}
                dotClass={visaSelected.dotClass}
              />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-[240px] p-1 rounded-2xl shadow-elevated border-border/60 bg-card/95 backdrop-blur-lg"
            >
              {VISA_OPTIONS.map((opt) => {
                const isActive = visaFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onVisaChange(opt.value);
                      setVisaOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          opt.dotClass
                        )}
                      />
                      <span>{opt.label}</span>
                    </span>
                    {isActive && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Clear all */}
      <AnimatePresence>
        {hasAnyActiveFilter && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center"
          >
            <div className="w-px bg-border/60 my-1.5" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-auto rounded-none px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear all
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FilterTriggerProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueBadge?: number;
  active: boolean;
  open: boolean;
  dotClass: string;
}

const FilterTrigger = forwardRef<
  HTMLButtonElement,
  FilterTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ icon, label, value, valueBadge, active, open, dotClass, ...rest }, ref) => {
  return (
    <button
      type="button"
      ref={ref}
      {...rest}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "relative flex items-center justify-center h-5 w-5 rounded-md transition-colors",
          active ? "bg-foreground/10" : "bg-transparent"
        )}
      >
        {icon}
        {active && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-card",
              dotClass
            )}
          />
        )}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </span>
        <span
          className={cn(
            "text-xs font-semibold max-w-[120px] truncate",
            active ? "text-foreground" : "text-foreground/80"
          )}
        >
          {value}
        </span>
      </span>
      {valueBadge !== undefined && (
        <span className="tabular-nums text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
          {valueBadge}
        </span>
      )}
      <ChevronDown
        className={cn(
          "h-3 w-3 text-muted-foreground/70 transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  );
});
FilterTrigger.displayName = "FilterTrigger";
