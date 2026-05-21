import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ExtractedResumeData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
  address?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  skills?: string[];
  work_experience?: {
    title: string;
    company: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    location?: string;
    description?: string;
  }[];
  education?: {
    school: string;
    degree?: string;
    major?: string;
    graduation_year?: string;
    gpa?: string;
  }[];
  certifications?: {
    name: string;
    issuer?: string;
    date_obtained?: string;
    expiration_date?: string;
  }[];
  summary?: string;
  experience_years?: number;
}

export function useResumeParser() {
  const [isParsing, setIsParsing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedResumeData | null>(null);
  const { toast } = useToast();

  const parseResume = async (file: File): Promise<ExtractedResumeData | null> => {
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: {
          file_base64: base64,
          filename: file.name,
          mime_type: file.type || "application/pdf",
        },
      });

      if (error) throw new Error(error.message || "Failed to parse resume");
      if (data?.error) throw new Error(data.error);

      const extracted = data.extracted as ExtractedResumeData;
      setExtractedData(extracted);
      return extracted;
    } catch (err: any) {
      toast({
        title: "Resume parsing failed",
        description: err.message || "Could not extract data from resume",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsParsing(false);
    }
  };

  const clearExtracted = () => setExtractedData(null);

  return { parseResume, isParsing, extractedData, clearExtracted };
}
