import { forwardRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface RelatedSearchesProps {
  query: string;
  onSelect: (term: string) => void;
}

export const RelatedSearches = forwardRef<HTMLDivElement, RelatedSearchesProps>(function RelatedSearches({ query, onSelect }, ref) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("suggest_job_titles", {
        query_text: q,
        max_results: 6,
      });
      if (cancelled || error || !data) return;
      const titles = (data as { suggestion: string }[])
        .map((r) => r.suggestion)
        .filter((t) => t.toLowerCase() !== q.toLowerCase())
        .slice(0, 5);
      setItems(titles);
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-wrap items-center gap-2 mb-4"
      >
        <span className="text-xs font-medium text-muted-foreground shrink-0">Related:</span>
        {items.map((term) => (
          <button
            key={term}
            onClick={() => onSelect(term)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-border/60 bg-card/60 text-foreground/80 hover:border-accent/60 hover:text-accent hover:bg-accent/5 transition-colors"
          >
            {term}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
});
