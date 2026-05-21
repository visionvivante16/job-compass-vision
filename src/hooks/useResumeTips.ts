import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";

export interface ResumeTip {
  tip: string;
  keyword: string;
  occurrences?: number;
}

// Module-level session cache: same job + same resume role => skip AI call.
// Cleared on full page refresh, which is fine — saves AI credits across
// repeated opens of the same job within one session.
const tipsCache = new Map<string, ResumeTip[]>();

function makeKey(jobTitle: string, jobDescription: string, role?: string) {
  return `${jobTitle}|${jobDescription.slice(0, 120)}|${role || "none"}`;
}

export function useResumeTips() {
  const [tips, setTips] = useState<ResumeTip[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const requestIdRef = useRef(0);

  const fetchTips = useCallback(async (params: {
    job_title: string;
    job_description: string;
    job_skills: string[];
    resume_intelligence: ResumeIntelligence;
  }) => {
    const key = makeKey(
      params.job_title,
      params.job_description,
      params.resume_intelligence?.primaryRole,
    );

    // Cache hit — instant response, no AI credit spent.
    const cached = tipsCache.get(key);
    if (cached) {
      setTips(cached);
      setIsLoading(false);
      return;
    }

    const myId = ++requestIdRef.current;
    setIsLoading(true);
    setTips(null);

    try {
      const { data, error } = await supabase.functions.invoke("resume-tips", {
        body: params,
      });

      if (myId !== requestIdRef.current) return;
      if (error) throw error;
      if (data?.tips) {
        tipsCache.set(key, data.tips);
        setTips(data.tips);
      }
    } catch (err: any) {
      if (myId !== requestIdRef.current) return;
      console.error("Resume tips error:", err);
      toast({
        title: "Couldn't generate tips",
        description: err?.message || "Try again later.",
        variant: "destructive",
      });
    } finally {
      if (myId === requestIdRef.current) setIsLoading(false);
    }
  }, [toast]);

  const clearTips = useCallback(() => {
    setTips(null);
  }, []);

  return { tips, isLoading, fetchTips, clearTips };
}
