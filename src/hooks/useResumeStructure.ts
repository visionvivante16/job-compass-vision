import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/** A single bullet item — stored as a plain string in the structure. */
export interface ResumeStructureItem {
  heading: string;
  subheading?: string;
  date?: string;
  bullets: string[];
}

export interface ResumeStructureSection {
  title: string;
  items: ResumeStructureItem[];
}

export interface ResumeStructure {
  header: { full_name: string; contact_details: string[] };
  summary?: string;
  skills: string[];
  sections: ResumeStructureSection[];
  /** Top-to-bottom order using section titles plus literals "summary" / "skills". */
  section_order?: string[];
}

/**
 * Loads the user's uploaded resume from the `resumes` storage bucket and
 * returns it as a structured outline that preserves the original sections,
 * order, items, and bullets exactly. Cached per user/resume version.
 */
export function useResumeStructure() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [structure, setStructure] = useState<ResumeStructure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, ResumeStructure>>(new Map());

  const load = useCallback(
    async (params: { resume_path: string; filename?: string; mime_type?: string; cache_key?: string }) => {
      if (!user) return null;
      const key = params.cache_key || `${user.id}::${params.resume_path}`;
      const cached = cache.current.get(key);
      if (cached) {
        setStructure(cached);
        return cached;
      }

      setIsLoading(true);
      setError(null);
      try {
        // The edge function now retries across models with its own 55s per-attempt
        // timeout, so we no longer need a client-side race. Just call and surface
        // any returned error.
        const { data, error: fnErr } = await supabase.functions.invoke("extract-resume-structure", {
          body: {
            resume_path: params.resume_path,
            filename: params.filename,
            mime_type: params.mime_type,
          },
        });
        if (fnErr) throw new Error(fnErr.message || "Failed to load resume");
        if (data?.error) throw new Error(data.error);
        if (!data?.structure) throw new Error("No structure returned");
        cache.current.set(key, data.structure);
        setStructure(data.structure);
        return data.structure as ResumeStructure;
      } catch (e: any) {
        const msg = e?.message || "Could not load your resume";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  const reset = useCallback(() => {
    setStructure(null);
    setError(null);
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
    setStructure(null);
  }, []);

  return { structure, isLoading, error, load, reset, clearCache };
}
