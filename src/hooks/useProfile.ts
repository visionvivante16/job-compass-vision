import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";

export interface WorkExperience {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  graduation_year: string;
}

export interface ProfileData {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  work_authorization: string | null;
  country: string | null;
  visa_status: string | null;
  experience_years: number | null;
  current_company: string | null;
  current_title: string | null;
  skills: string[] | null;
  work_experience: WorkExperience[] | null;
  education: Education[] | null;
  certifications: { name: string; issuer: string; date_obtained: string; expiration_date: string }[] | null;
  resume_url: string | null;
  resume_filename: string | null;
  is_premium: boolean;
  avatar_url: string | null;
  emoji_avatar: string | null;
  gender: string | null;
  race_ethnicity: string | null;
  hispanic_latino: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  military_service: string | null;
  resume_intelligence: ResumeIntelligence | null;
  updated_at: string;
}

function createClearedResumeFields(filePath: string, fileName: string): Partial<ProfileData> {
  return {
    resume_url: filePath,
    resume_filename: fileName,
    resume_intelligence: null,
    first_name: null,
    last_name: null,
    full_name: null,
    contact_email: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    location: null,
    linkedin_url: null,
    github_url: null,
    portfolio_url: null,
    current_company: null,
    current_title: null,
    experience_years: null,
    skills: [],
    work_experience: [],
    education: [],
    certifications: [],
  };
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      // PROMO: everything is free for everyone — force is_premium=true app-wide.
      // Silences all upgrade banners, popups, and gates without touching individual components.
      return { ...(data as any), is_premium: true } as unknown as ProfileData;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    refetchOnWindowFocus: true,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<ProfileData>) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("user_id", user.id)
        .select("*")
        .single();
      
      if (error) throw error;
      return data as unknown as ProfileData;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["profile", user?.id], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["recommended-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-matches"] });
      queryClient.invalidateQueries({ queryKey: ["job-search"] });
      // Force tailored resume cache to invalidate
      queryClient.invalidateQueries({ queryKey: ["tailored-resume"] });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn't save your changes",
        description: friendlyError(error, "Please try again in a moment."),
        variant: "destructive",
      });
    },
  });

  const uploadResume = async (file: File, options?: { silent?: boolean }) => {
    if (!user) throw new Error("Not authenticated");
    const silent = options?.silent ?? false;
    
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOC, or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Add timestamp to path to guarantee unique URL on every upload
      const timestamp = Date.now();
      const filePath = `${user.id}/${timestamp}_${file.name}`;
      const clearedResumeFields = createClearedResumeFields(filePath, file.name);
      
      if (profile?.resume_url) {
        const oldPath = profile.resume_url.split("/").slice(-2).join("/");
        await supabase.storage.from("resumes").remove([oldPath]);
      }
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      if (profile) {
        queryClient.setQueryData(["profile", user.id], {
          ...profile,
          ...clearedResumeFields,
          updated_at: new Date().toISOString(),
        });
      }
      
      // Clear all resume-derived fields immediately so old resumes can never be reused.
      await updateProfileMutation.mutateAsync(clearedResumeFields);
      
      if (!silent) {
        toast({
          title: "Resume uploaded",
          description: "Your resume has been saved.",
        });
      }
    } catch (error: any) {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({
        title: "Upload failed",
        description: friendlyError(error, "We couldn't upload your resume. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadResume = async () => {
    if (!profile?.resume_url || !user) return;
    
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(profile.resume_url);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = profile.resume_filename || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: friendlyError(error, "We couldn't download your resume. Please try again."),
        variant: "destructive",
      });
    }
  };

  const deleteResume = async () => {
    if (!profile?.resume_url || !user) return;
    
    try {
      const { error } = await supabase.storage
        .from("resumes")
        .remove([profile.resume_url]);
      
      if (error) throw error;
      
      await updateProfileMutation.mutateAsync({
        resume_url: null,
        resume_filename: null,
      });
      
      toast({
        title: "Resume deleted",
        description: "Your resume has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: friendlyError(error, "We couldn't delete your resume. Please try again."),
        variant: "destructive",
      });
    }
  };

  return {
    profile,
    isLoading,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    uploadResume,
    downloadResume,
    deleteResume,
    isUploading,
  };
}
