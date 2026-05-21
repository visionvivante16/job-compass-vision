import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Suggestion {
  suggestion: string;
  match_count: number;
}

export function useSearchSuggestions(query: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      abortRef.current?.abort();
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const request = supabase.rpc("suggest_job_titles", {
          query_text: query.trim(),
          max_results: 8,
        }).abortSignal(controller.signal);

        const { data, error } = await request;
        if (controller.signal.aborted) return;
        if (!error && data) {
          setSuggestions(data as Suggestion[]);
        }
      } catch {
        // silent
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query, enabled]);

  return { suggestions, isLoading };
}
