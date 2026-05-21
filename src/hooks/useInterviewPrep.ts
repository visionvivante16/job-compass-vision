import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { friendlyError } from "@/lib/friendlyError";

export interface InterviewPrepData {
  technicalQuestions: {
    question: string;
    suggestedAnswer: string;
    difficulty: "easy" | "medium" | "hard";
  }[];
  behavioralQuestions: {
    question: string;
    suggestedAnswer: string;
  }[];
}

export function useInterviewPrep() {
  const [prep, setPrep] = useState<InterviewPrepData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const cache = useRef<Map<string, InterviewPrepData>>(new Map());

  const generatePrep = useCallback(async (params: {
    job_title: string;
    job_description: string;
    job_skills: string[];
    resume_intelligence?: ResumeIntelligence | null;
  }) => {
    // Cache key: job title + first 100 chars of desc + resume role
    const cacheKey = `${params.job_title}|${params.job_description.slice(0, 100)}|${params.resume_intelligence?.primaryRole || "none"}`;
    
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setPrep(cached);
      return;
    }

    setIsLoading(true);
    setPrep(null);

    try {
      const { data, error } = await supabase.functions.invoke("interview-prep", {
        body: params,
      });

      if (error) throw error;
      if (data?.prep) {
        cache.current.set(cacheKey, data.prep);
        setPrep(data.prep);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error("Interview prep error:", err);
      toast({
        title: "Couldn't generate interview prep",
        description: friendlyError(err, "Please try again in a moment."),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearPrep = useCallback(() => {
    setPrep(null);
  }, []);

  return { prep, isLoading, generatePrep, clearPrep };
}
