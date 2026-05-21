import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useCreateJob, useUpdateJob, useUploadLogo } from "@/hooks/useAdminJobs";
import { Job, EmploymentType } from "@/types/job";
import { Loader2, Upload, X, Link as LinkIcon } from "lucide-react";
import { isHighExperienceJob } from "@/lib/jobFilters";
import { toast } from "sonner";
 
 interface JobFormProps {
   job?: Job | null;
   onClose: () => void;
 }
 
 export function JobForm({ job, onClose }: JobFormProps) {
   const createJob = useCreateJob();
   const updateJob = useUpdateJob();
   const uploadLogo = useUploadLogo();
   const fileInputRef = useRef<HTMLInputElement>(null);
 
  const EMPLOYMENT_TYPES: EmploymentType[] = ['Full Time', 'Contract', 'Internship', 'Part Time'];

  const [formData, setFormData] = useState({
    title: job?.title || "",
    company: job?.company || "",
    company_logo: job?.company_logo || "",
    location: job?.location || "",
    description: job?.description || "",
    skills: job?.skills.join(", ") || "",
    external_apply_link: job?.external_apply_link || "",
    salary_range: job?.salary_range || "",
    employment_type: job?.employment_type || "Full Time" as EmploymentType,
    experience_years: job?.experience_years || "",
    is_published: job?.is_published || false,
    is_reviewing: job?.is_reviewing || false,
  });
 
   const [logoInputMode, setLogoInputMode] = useState<"upload" | "url">("upload");
   const isLoading = createJob.isPending || updateJob.isPending || uploadLogo.isPending;
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isHighExperienceJob({
      title: formData.title,
      description: formData.description,
      experience_years: formData.experience_years || null,
    })) {
      toast.error("This job requires more than 5 years of experience and cannot be posted. Only 0–5 years roles are allowed.");
      return;
    }

    const jobData = {
      ...formData,
      skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
      company_logo: formData.company_logo || null,
      salary_range: formData.salary_range || null,
      experience_years: formData.experience_years || null,
    };
 
     if (job) {
       await updateJob.mutateAsync({ id: job.id, data: jobData });
     } else {
       await createJob.mutateAsync(jobData);
     }
 
     onClose();
   };
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     const url = await uploadLogo.mutateAsync(file);
     setFormData((prev) => ({ ...prev, company_logo: url }));
   };
 
   const removeLogo = () => {
     setFormData((prev) => ({ ...prev, company_logo: "" }));
   };
 
   return (
     <Card className="p-6 border-border/60">
       <form onSubmit={handleSubmit} className="space-y-6">
         <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-semibold text-foreground">
             {job ? "Edit Job" : "Add New Job"}
           </h2>
           <Button type="button" variant="ghost" size="icon" onClick={onClose}>
             <X className="h-4 w-4" />
           </Button>
         </div>
 
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
             <Label htmlFor="title">Job Title *</Label>
             <Input
               id="title"
               value={formData.title}
               onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
               placeholder="Senior Frontend Developer"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="company">Company *</Label>
             <Input
               id="company"
               value={formData.company}
               onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
               placeholder="Acme Inc."
               required
             />
           </div>
         </div>
 
         {/* Company Logo */}
         <div className="space-y-2">
           <Label>Company Logo</Label>
           <div className="flex items-start gap-4">
             <CompanyLogo
               logoUrl={formData.company_logo}
               companyName={formData.company}
               size="lg"
             />
             <div className="flex-1 space-y-3">
               <div className="flex gap-2">
                 <Button
                   type="button"
                   variant={logoInputMode === "upload" ? "secondary" : "ghost"}
                   size="sm"
                   onClick={() => setLogoInputMode("upload")}
                 >
                   <Upload className="h-4 w-4 mr-1" />
                   Upload
                 </Button>
                 <Button
                   type="button"
                   variant={logoInputMode === "url" ? "secondary" : "ghost"}
                   size="sm"
                   onClick={() => setLogoInputMode("url")}
                 >
                   <LinkIcon className="h-4 w-4 mr-1" />
                   URL
                 </Button>
               </div>
 
               {logoInputMode === "upload" ? (
                 <div className="flex items-center gap-2">
                   <input
                     ref={fileInputRef}
                     type="file"
                     accept="image/*"
                     onChange={handleFileChange}
                     className="hidden"
                   />
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => fileInputRef.current?.click()}
                     disabled={uploadLogo.isPending}
                   >
                     {uploadLogo.isPending ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       "Choose File"
                     )}
                   </Button>
                   {formData.company_logo && (
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={removeLogo}
                       className="text-destructive"
                     >
                       Remove
                     </Button>
                   )}
                 </div>
               ) : (
                 <Input
                   placeholder="https://example.com/logo.png"
                   value={formData.company_logo}
                   onChange={(e) => setFormData((p) => ({ ...p, company_logo: e.target.value }))}
                 />
               )}
             </div>
           </div>
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="location">Location *</Label>
           <Input
             id="location"
             value={formData.location}
             onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
             placeholder="San Francisco, CA (Remote)"
             required
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="description">Description *</Label>
           <Textarea
             id="description"
             value={formData.description}
             onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
             placeholder="Describe the role, requirements, and benefits..."
             rows={4}
             required
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="skills">Skills (comma separated)</Label>
           <Input
             id="skills"
             value={formData.skills}
             onChange={(e) => setFormData((p) => ({ ...p, skills: e.target.value }))}
             placeholder="React, TypeScript, Node.js"
           />
         </div>
 
        <div className="space-y-2">
          <Label htmlFor="external_apply_link">External Apply Link *</Label>
          <Input
            id="external_apply_link"
            type="url"
            value={formData.external_apply_link}
            onChange={(e) => setFormData((p) => ({ ...p, external_apply_link: e.target.value }))}
            placeholder="https://careers.example.com/job/123"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employment_type">Employment Type *</Label>
            <Select
              value={formData.employment_type}
              onValueChange={(value: EmploymentType) => setFormData((p) => ({ ...p, employment_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience_years">Experience (optional)</Label>
            <Input
              id="experience_years"
              value={formData.experience_years}
              onChange={(e) => setFormData((p) => ({ ...p, experience_years: e.target.value }))}
              placeholder="2–4 yrs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary_range">Salary Range (optional)</Label>
          <Input
            id="salary_range"
            value={formData.salary_range}
            onChange={(e) => setFormData((p) => ({ ...p, salary_range: e.target.value }))}
            placeholder="$120k - $150k"
          />
        </div>
 
         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 pt-4">
           <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
               <Switch
                 id="is_published"
                 checked={formData.is_published}
                 onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_published: checked }))}
               />
               <Label htmlFor="is_published">Published</Label>
             </div>
             <div className="flex items-center gap-2">
               <Switch
                 id="is_reviewing"
                 checked={formData.is_reviewing}
                 onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_reviewing: checked }))}
               />
               <Label htmlFor="is_reviewing">Actively Reviewing</Label>
             </div>
           </div>
 
           <div className="flex gap-2">
             <Button type="button" variant="outline" onClick={onClose}>
               Cancel
             </Button>
             <Button type="submit" variant="accent" disabled={isLoading}>
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : job ? "Update Job" : "Create Job"}
             </Button>
           </div>
         </div>
       </form>
     </Card>
   );
 }