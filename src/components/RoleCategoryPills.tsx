import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Sparkles, Search } from "lucide-react";
import { useRoleCategoryCounts } from "@/hooks/useRoleCategoryCounts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleCategoryPillsProps {
  /** Currently selected category id, or null for "All" */
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function RoleCategoryPills({ selectedCategoryId, onSelect }: RoleCategoryPillsProps) {
  const { data, isLoading } = useRoleCategoryCounts();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allPills = useMemo(() => {
    const curated = (data?.curated ?? []).filter((c) => c.count > 0);
    const other = data?.other ?? [];
    return [...curated, ...other];
  }, [data]);

  const totalCount = useMemo(
    () => allPills.reduce((sum, p) => sum + p.count, 0),
    [allPills]
  );

  const selected = allPills.find((p) => p.category.id === selectedCategoryId);

  const filtered = useMemo(() => {
    if (!query.trim()) return allPills;
    const q = query.trim().toLowerCase();
    return allPills.filter((p) => p.category.label.toLowerCase().includes(q));
  }, [allPills, query]);

  if (isLoading) {
    return (
      <div className="mb-4">
        <Skeleton className="h-10 w-64 rounded-full" />
      </div>
    );
  }

  if (!allPills.length) return null;

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="mb-4" data-tour="role-pills">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group inline-flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "bg-card/60 backdrop-blur-md border-border/60 hover:border-foreground/30 shadow-sm"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full shrink-0",
                selected
                  ? "bg-foreground text-background"
                  : "bg-foreground/90 text-background"
              )}
            >
              <Sparkles className="h-3 w-3" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Role
              </span>
              <span className="text-sm font-semibold text-foreground">
                {selected ? selected.category.label : "All roles"}
              </span>
            </span>
            <span className="ml-1 tabular-nums text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {selected ? selected.count : totalCount}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[320px] p-0 rounded-2xl shadow-elevated border-border/60 bg-card/95 backdrop-blur-lg overflow-hidden"
        >
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles…"
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-secondary/60 rounded-lg border border-transparent focus:border-border focus:outline-none placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                selectedCategoryId === null
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {selectedCategoryId === null && <Check className="h-3 w-3 shrink-0" />}
                <span className="truncate">All roles</span>
              </span>
              <span
                className={cn(
                  "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                  selectedCategoryId === null
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {totalCount}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {filtered.map(({ category, count }) => {
                const isActive = selectedCategoryId === category.id;
                return (
                  <motion.button
                    key={category.id}
                    layout
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => handleSelect(isActive ? null : category.id)}
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
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No roles match "{query}"
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
