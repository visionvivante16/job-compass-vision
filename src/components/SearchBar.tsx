import { useState, useCallback, useRef, useEffect, memo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { SearchSuggestions } from "@/components/SearchSuggestions";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (committedValue?: string) => void;
  onSuggestionSelect?: (suggestion: string) => void;
}

export const SearchBar = memo(function SearchBar({ value, onChange, placeholder = "Search jobs by title, company, skills…", onSearch, onSuggestionSelect }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { suggestions } = useSearchSuggestions(localValue, isFocused);
  const inputRef = useRef<HTMLInputElement>(null);
  const emitTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (localValue === value) return;

    clearTimeout(emitTimeoutRef.current);
    emitTimeoutRef.current = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => {
      clearTimeout(emitTimeoutRef.current);
    };
  }, [localValue, value, onChange]);

  const flushChange = useCallback((nextValue: string) => {
    clearTimeout(emitTimeoutRef.current);
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }, [onChange, value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    setHighlightedIndex(-1);
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue("");
    flushChange("");
    onChange("");
    onSearch?.();
    inputRef.current?.focus();
  }, [flushChange, onChange, onSearch]);

  const showSuggestions = isFocused && localValue.trim().length >= 2 && suggestions.length > 0;

  const handleSelect = useCallback((suggestion: string) => {
    setLocalValue(suggestion);
    flushChange(suggestion);
    setIsFocused(false);
    setHighlightedIndex(-1);
    onSuggestionSelect?.(suggestion);
    onSearch?.(suggestion);
  }, [flushChange, onSuggestionSelect, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex].suggestion);
        return;
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        inputRef.current?.blur();
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      flushChange(localValue);
      setIsFocused(false);
      onSearch?.(localValue);
    }
  }, [showSuggestions, suggestions, highlightedIndex, handleSelect, flushChange, localValue, onSearch]);

  return (
    <div className="relative group" data-tour="search-bar">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        onKeyDown={handleKeyDown}
        className="pl-12 pr-10 h-12 bg-card border-border/60 rounded-full text-base shadow-soft focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 placeholder:text-muted-foreground/50"
        autoComplete="off"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
      <SearchSuggestions
        suggestions={suggestions}
        isOpen={showSuggestions}
        onSelect={handleSelect}
        highlightedIndex={highlightedIndex}
        query={localValue}
      />
    </div>
  );
});
