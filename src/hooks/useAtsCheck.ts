import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { scheduleFeedbackPrompt } from "@/hooks/useFeedbackPrompt";
import { friendlyError } from "@/lib/friendlyError";

export interface AtsCheckResult {
  overall_score: number;
  keyword_match_score: number;
  experience_match_score: number;
  skills_match_score: number;
  education_match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  strengths: string[];
  improvements: string[];
  verdict: "strong_match" | "good_match" | "moderate_match" | "weak_match";
  summary: string;
}

// Module-level session cache: skips AI call when the same job + same profile
// fingerprint is checked again within the session. Cleared on full refresh.
const atsCache = new Map<string, AtsCheckResult>();

function makeAtsKey(
  jobTitle: string,
  jobDescription: string,
  profileSrc: any,
): string {
  const skills = (profileSrc?.skills || []).slice(0, 12).join(",");
  const exp = profileSrc?.experience_years ?? "";
  const title = profileSrc?.current_title || "";
  return `${jobTitle}|${jobDescription.slice(0, 120)}|${title}|${exp}|${skills}`;
}

export function useAtsCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<AtsCheckResult | null>(null);
  const { profile } = useProfile();
  const { toast } = useToast();

  // Track the latest in-flight request so we can ignore stale responses.
  const requestIdRef = useRef(0);

  const runCheck = async (params: {
    job_description?: string;
    job_title?: string;
    job_skills?: string[];
    /** Override profile data with current form state (unsaved edits) */
    formProfile?: {
      skills?: string[] | null;
      experience_years?: number | null;
      current_title?: string | null;
      current_company?: string | null;
      work_experience?: any[] | null;
      education?: any[] | null;
      certifications?: any[] | null;
    };
  }): Promise<AtsCheckResult | null> => {
    if (!profile && !params.formProfile) {
      toast({ title: "Profile required", description: "Please complete your profile before running an ATS check.", variant: "destructive" });
      return null;
    }

    const profileSource = params.formProfile || profile;
    const myRequestId = ++requestIdRef.current;

    // Check session cache first — saves AI credits when reopening the same job.
    const cacheKey = makeAtsKey(
      params.job_title || "",
      params.job_description || "",
      profileSource,
    );
    const cached = atsCache.get(cacheKey);
    if (cached) {
      setResult(cached);
      return cached;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("ats-check", {
        body: {
          job_description: params.job_description || "",
          job_title: params.job_title || "",
          job_skills: params.job_skills || [],
          profile: {
            skills: profileSource?.skills,
            experience_years: profileSource?.experience_years,
            current_title: profileSource?.current_title,
            current_company: profileSource?.current_company,
            work_experience: profileSource?.work_experience,
            education: profileSource?.education,
            certifications: profileSource?.certifications,
          },
        },
      });

      // A newer request superseded this one — silently discard.
      if (myRequestId !== requestIdRef.current) return null;

      if (error) throw new Error(error.message || "ATS check failed");
      if (data?.error) throw new Error(data.error);

      const atsResult = data.result as AtsCheckResult;
      atsCache.set(cacheKey, atsResult);
      setResult(atsResult);
      scheduleFeedbackPrompt("ats", 5000);
      return atsResult;
    } catch (err: any) {
      // Only surface errors for the most recent request to avoid noisy toasts
      // from superseded calls or transient network blips.
      if (myRequestId !== requestIdRef.current) return null;

      const msg = String(err?.message || "");
      const isTransient =
        msg.includes("Failed to send a request") ||
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("aborted");

      if (!isTransient) {
        toast({
          title: "ATS Check failed",
          description: friendlyError(err, "We couldn't complete the analysis. Please try again."),
          variant: "destructive",
        });
      }
      return null;
    } finally {
      if (myRequestId === requestIdRef.current) setIsChecking(false);
    }
  };

  const clearResult = () => setResult(null);

  return { runCheck, isChecking, result, clearResult };
}
