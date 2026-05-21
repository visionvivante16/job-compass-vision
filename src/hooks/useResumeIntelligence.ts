import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

export interface ResumeIntelligence {
  primaryRole: string;
  primaryStack: string[];
  experienceLevel: "fresher" | "junior" | "mid" | "senior" | "lead";
  yearsOfExperience?: number;
  topSkills: string[];
  secondarySkills?: string[];
  education?: {
    degree: string;
    field: string;
    isInternational: boolean;
    visaStatus: "citizen" | "greencard" | "h1b" | "opt" | "stemopt" | "f1" | "other" | "unknown";
  };
  currentDomain?: string;
  openToDomains?: string[];
  careerTrajectory?: string;
  jobTitlesToTarget: string[];
  salaryRange?: { min: number; max: number; currency: string };
  locationPreference?: string[];
  strengthSummary: string;
  improvementAreas?: string[];
  uniqueSellingPoint?: string;
}

interface AnalyzeParams {
  resumeText?: string;
  skills?: string[];
  workExperience?: any[];
  education?: any[];
  currentTitle?: string;
  experienceYears?: number;
}

export function useResumeIntelligence() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const analyzeResume = async (params: AnalyzeParams): Promise<ResumeIntelligence | null> => {
    setIsAnalyzing(true);

    // Immediately clear stale recommendation cache before analysis starts
    queryClient.removeQueries({ queryKey: ["recommended-jobs"] });

    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          resume_text: params.resumeText,
          skills: params.skills,
          work_experience: params.workExperience,
          education: params.education,
          current_title: params.currentTitle,
          experience_years: params.experienceYears,
        },
      });

      if (error) throw new Error(error.message || "Analysis failed");
      if (data?.error) throw new Error(data.error);

      const intelligence = data.intelligence as ResumeIntelligence;

      // Force-refetch all dependent data so UI reflects new intelligence everywhere
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["recommended-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-matches"] });
      queryClient.invalidateQueries({ queryKey: ["job-search"] });

      toast({
        title: "Resume analyzed ✨",
        description: `Identified as ${intelligence.primaryRole} (${intelligence.experienceLevel})`,
      });

      return intelligence;
    } catch (err: any) {
      toast({
        title: "Resume analysis failed",
        description: err.message || "Could not analyze resume",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzeResume, isAnalyzing };
}
