import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/types/job";
import { toast } from "sonner";
import { enrichJobSkills } from "@/lib/jobEnrichment";
 
interface JobFormData {
  title: string;
  company: string;
  company_logo?: string | null;
  location: string;
  description: string;
  skills: string[];
  external_apply_link: string;
  is_published: boolean;
  is_reviewing: boolean;
  salary_range?: string | null;
  employment_type: string;
  experience_years?: string | null;
}
 
function parseJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    company_logo: row.company_logo,
    location: row.location,
    description: row.description,
    skills: row.skills || [],
    external_apply_link: row.external_apply_link,
    is_published: row.is_published,
    is_reviewing: row.is_reviewing,
    salary_range: row.salary_range,
    employment_type: row.employment_type || 'Full Time',
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    deleted_at: row.deleted_at || null,
    created_by_user_id: row.created_by_user_id || null,
    description_enriched: row.description_enriched ?? false,
    description_source: row.description_source ?? null,
  };
}
 
 export function useAdminJobs() {
   return useQuery({
     queryKey: ["admin-jobs"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("jobs")
         .select("*")
         .is("deleted_at", null)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       return (data || []).map(parseJob);
     },
   });
 }
 
 export function useCreateJob() {
   const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: async (data: JobFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

       const enrichedSkills = enrichJobSkills({
         ...data,
         id: '', posted_date: new Date(), created_at: new Date(), updated_at: new Date(),
         is_published: data.is_published, is_reviewing: data.is_reviewing,
         salary_range: data.salary_range || null, experience_years: data.experience_years || null,
         company_logo: data.company_logo || null, employment_type: (data.employment_type || 'Full Time') as any,
         external_apply_link: data.external_apply_link,
       } as Job);

       const { error } = await supabase.from("jobs").insert({
         title: data.title,
         company: data.company,
         company_logo: data.company_logo || null,
         location: data.location,
         description: data.description,
         skills: enrichedSkills,
        external_apply_link: data.external_apply_link,
        is_published: data.is_published,
        is_reviewing: data.is_reviewing,
        salary_range: data.salary_range || null,
        employment_type: data.employment_type,
        experience_years: data.experience_years || null,
        created_by_user_id: user.id,
      });

      if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
       queryClient.invalidateQueries({ queryKey: ["jobs"] });
       toast.success("Job created successfully!");
     },
     onError: (error) => {
       toast.error("Failed to create job: " + error.message);
     },
   });
 }
 
 export function useUpdateJob() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, data }: { id: string; data: Partial<JobFormData> }) => {
       const { error } = await supabase
         .from("jobs")
         .update(data)
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
       queryClient.invalidateQueries({ queryKey: ["jobs"] });
       toast.success("Job updated successfully!");
     },
     onError: (error) => {
       toast.error("Failed to update job: " + error.message);
     },
   });
 }
 
export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: set deleted_at timestamp instead of removing
      const { error } = await supabase
        .from("jobs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job moved to trash (can be restored)");
    },
    onError: (error) => {
      toast.error("Failed to delete job: " + error.message);
    },
  });
}

export function useDeletedJobs() {
  return useQuery({
    queryKey: ["deleted-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(parseJob);
    },
  });
}

export function useRestoreJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jobs")
        .update({ deleted_at: null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job restored successfully!");
    },
    onError: (error) => {
      toast.error("Failed to restore job: " + error.message);
    },
  });
}

export function usePermanentDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-jobs"] });
      toast.success("Job permanently deleted");
    },
    onError: (error) => {
      toast.error("Failed to permanently delete job: " + error.message);
    },
  });
}

export function useDuplicateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (job: Job) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("jobs").insert({
        title: job.title + " (Copy)",
        company: job.company,
        company_logo: job.company_logo,
        location: job.location,
        description: job.description,
        skills: job.skills,
        external_apply_link: job.external_apply_link,
        is_published: false, // Duplicates start as drafts
        is_reviewing: false,
        salary_range: job.salary_range,
        employment_type: job.employment_type,
        experience_years: job.experience_years,
        created_by_user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      toast.success("Job duplicated! Edit the copy to customize.");
    },
    onError: (error) => {
      toast.error("Failed to duplicate job: " + error.message);
    },
  });
}
 
 export function useUploadLogo() {
   return useMutation({
     mutationFn: async (file: File) => {
       const fileExt = file.name.split(".").pop();
       const fileName = `${crypto.randomUUID()}.${fileExt}`;
 
       const { error: uploadError } = await supabase.storage
         .from("company-logos")
         .upload(fileName, file);
 
       if (uploadError) throw uploadError;
 
       const { data } = supabase.storage
         .from("company-logos")
         .getPublicUrl(fileName);
 
       return data.publicUrl;
     },
     onError: (error) => {
       toast.error("Failed to upload logo: " + error.message);
     },
   });
 }