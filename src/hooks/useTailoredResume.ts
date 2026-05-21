import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import type { ResumeStructure } from "@/hooks/useResumeStructure";
import { friendlyError } from "@/lib/friendlyError";

/**
 * The tailored output from the edge function. Same shape as ResumeStructure
 * but bullets carry { text, original, changed } and the summary tracks change.
 */
export interface TailoredBullet {
  text: string;
  original: string;
  changed: boolean;
}

export interface TailoredItem {
  heading: string;
  subheading?: string;
  date?: string;
  bullets: TailoredBullet[];
}

export interface TailoredSection {
  title: string;
  items: TailoredItem[];
}

export interface TailoredResumeData {
  header: { full_name: string; contact_details: string[] };
  summary: string;
  summary_original: string;
  summary_changed: boolean;
  skills: string[];
  sections: TailoredSection[];
  keywords_added: string[];
  changes_count: number;
}

interface GenerateParams {
  job_title: string;
  job_description: string;
  job_skills: string[];
  company_name?: string;
  resume_structure: ResumeStructure;
  cache_key: string;
  force?: boolean;
  previous_result?: TailoredResumeData | null;
}

export function useTailoredResume() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TailoredResumeData | null>(null);
  const cache = useRef<Map<string, TailoredResumeData>>(new Map());
  const { toast } = useToast();
  const { user } = useAuth();

  const generate = useCallback(
    async (params: GenerateParams) => {
      if (!user) return null;

      const cached = cache.current.get(params.cache_key) ?? null;

      if (!params.force) {
        if (cached) {
          setResult(cached);
          return cached;
        }
      } else {
        cache.current.delete(params.cache_key);
      }

      setIsGenerating(true);
      setResult(null);

      try {
        const { data, error } = await supabase.functions.invoke("tailor-resume", {
          body: {
            job_title: params.job_title,
            job_description: params.job_description,
            job_skills: params.job_skills,
            company_name: params.company_name,
            resume_structure: params.resume_structure,
            previous_result: params.previous_result ?? cached,
          },
        });

        if (error) {
          const msg = typeof error === "object" && "message" in error ? error.message : String(error);
          throw new Error(msg || "Failed to generate tailored resume");
        }
        if (data?.error) throw new Error(data.error);
        if (!data?.sections) throw new Error("Incomplete resume returned. Please try again.");

        const tailored = data as TailoredResumeData;
        cache.current.set(params.cache_key, tailored);
        setResult(tailored);
        return tailored;
      } catch (err: unknown) {
        toast({
          title: "Resume tailoring failed",
          description: friendlyError(err, "We couldn't generate your tailored resume. Please try again."),
          variant: "destructive",
        });
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [user, toast],
  );

  const clearCache = useCallback(() => {
    cache.current.clear();
    setResult(null);
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { generate, isGenerating, result, clearResult, clearCache };
}
