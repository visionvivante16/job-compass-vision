import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Suggestion } from "@/hooks/useSearchSuggestions";

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  isOpen: boolean;
  onSelect: (suggestion: string) => void;
  highlightedIndex: number;
  query: string;
}

function highlightMatch(text: string, query: string) {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchSuggestions({ suggestions, isOpen, onSelect, highlightedIndex, query }: SearchSuggestionsProps) {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className="absolute left-0 right-0 top-full mt-1.5 z-50
          bg-card/95 backdrop-blur-xl border border-border/60
          rounded-xl shadow-elevated overflow-hidden"
      >
        <div className="py-1.5">
          {suggestions.map((s, i) => (
            <button
              key={s.suggestion}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s.suggestion);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                ${i === highlightedIndex
                  ? "bg-accent/10 text-foreground"
                  : "text-foreground/80 hover:bg-secondary/60"
                }`}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left truncate">
                {highlightMatch(s.suggestion, query)}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
