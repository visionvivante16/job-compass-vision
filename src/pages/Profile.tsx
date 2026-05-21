import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProfile, ProfileData, WorkExperience, Education } from "@/hooks/useProfile";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { useToast } from "@/hooks/use-toast";
import { useResumeParser, ExtractedResumeData } from "@/hooks/useResumeParser";
import { useResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProfileAtsPanel } from "@/components/ProfileAtsPanel";
import { useUserRole, useAllUserRoles } from "@/hooks/usePermissions";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileWelcomeBanner, SkillsCloudWidget } from "@/components/ProfileBentoWidgets";
import { ResumeIntelligenceCard } from "@/components/ResumeIntelligenceCard";
import { SubscriptionBillingCard } from "@/components/SubscriptionBillingCard";
import { ParticleField } from "@/components/about/ParticleField";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/data/countries";
import {
  User, FileText, Upload, Download, Trash2, Loader2, Bug,
  Link2, Briefcase, GraduationCap, Sparkles, Plus, Wand2, Award, Pencil, X, Target, Bell, Mail, Shield, KeyRound, Eye, EyeOff, Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { LocationAutocomplete, LocationParts } from "@/components/LocationAutocomplete";

const WORK_AUTH_OPTIONS = [
  "US Citizen", "Permanent Resident (Green Card)", "H-1B", "OPT / CPT",
  "TN Visa", "L-1 Visa", "Other Work Visa", "Not Authorized",
];
const VISA_STATUS_OPTIONS = ["Not Applicable", "Have visa", "Need sponsorship", "Will need sponsorship in future"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
const RACE_ETHNICITY_OPTIONS = [
  "American Indian or Alaska Native", "Asian", "Black or African American",
  "Native Hawaiian or Other Pacific Islander", "White", "Two or More Races", "Prefer not to say",
];
const HISPANIC_LATINO_OPTIONS = ["Yes", "No", "Prefer not to say"];
const VETERAN_OPTIONS = [
  "I am not a protected veteran",
  "I identify as one or more of the classifications of a protected veteran",
  "Prefer not to say",
];
const DISABILITY_OPTIONS = [
  "Yes, I have a disability (or previously had a disability)",
  "No, I do not have a disability",
  "Prefer not to say",
];
const MILITARY_OPTIONS = ["Yes", "No", "Prefer not to say"];

const emptyWork: WorkExperience = { title: "", company: "", start_date: "", end_date: "", is_current: false };
const emptyEdu: Education = { school: "", degree: "", major: "", graduation_year: "" };

interface Certification {
  name: string;
  issuer: string;
  date_obtained: string;
  expiration_date: string;
}
const emptyCert: Certification = { name: "", issuer: "", date_obtained: "", expiration_date: "" };

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating, uploadResume, downloadResume, deleteResume, isUploading } = useProfile();
  const { toast } = useToast();
  const { parseResume, isParsing, extractedData, clearExtracted } = useResumeParser();
  const { analyzeResume, isAnalyzing } = useResumeIntelligence();


  const { data: effectiveRole, isLoading: roleLoading } = useUserRole();
  const { data: allRoles } = useAllUserRoles();
  const hasAdminRole = allRoles?.some(({ role }) => role === "admin") ?? false;
  const showRoleDebug = effectiveRole === "founder" || hasAdminRole;
  const debugDisplayRole = effectiveRole === "founder" ? "founder" : hasAdminRole ? "admin" : effectiveRole || "user";
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", contact_email: "", phone: "", address: "", city: "", state: "", zip: "", country: "",
    linkedin_url: "", github_url: "", portfolio_url: "",
    work_authorization: "", visa_status: "",
    experience_years: "" as string | number,
    current_company: "", current_title: "", skills: "",
    gender: "", race_ethnicity: "", hispanic_latino: "",
    veteran_status: "", disability_status: "", military_service: "",
  });

  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([{ ...emptyWork }]);
  const [educations, setEducations] = useState<Education[]>([{ ...emptyEdu }]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [showAutofillPrompt, setShowAutofillPrompt] = useState(false);
  const [pendingExtracted, setPendingExtracted] = useState<ExtractedResumeData | null>(null);
  const lastResumeTextRef = useRef<string>("");

  // Password bridge state for Google users
  const [extPassword, setExtPassword] = useState("");
  const [extConfirmPassword, setExtConfirmPassword] = useState("");
  const [extPasswordSaving, setExtPasswordSaving] = useState(false);
  const [showExtPassword, setShowExtPassword] = useState(false);

  const providers = user?.app_metadata?.providers as string[] | undefined;
  const mainProvider = user?.app_metadata?.provider as string | undefined;
  const hasGoogleProvider = mainProvider === "google" || (providers?.includes("google") ?? false);
  const hasEmailProvider = mainProvider === "email" || (providers?.includes("email") ?? false);
  const isGoogleOnlyUser = hasGoogleProvider && !hasEmailProvider;
  const hasPasswordLogin = hasEmailProvider || user?.user_metadata?.password_login_enabled === true;
  const [extPasswordSet, setExtPasswordSet] = useState(hasPasswordLogin);

  useEffect(() => {
    setExtPasswordSet(hasPasswordLogin);
  }, [hasPasswordLogin]);

  const handleSetExtensionPassword = async () => {
    if (extPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (extPassword !== extConfirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setExtPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: extPassword,
        data: {
          ...(user?.user_metadata ?? {}),
          password_login_enabled: true,
        },
      });
      if (error) throw error;
      if (user) {
        localStorage.setItem(`sociax_ext_pwd_dismissed:${user.id}`, "true");
      }
      setExtPasswordSet(true);
      setExtPassword("");
      setExtConfirmPassword("");
      toast({ title: "Password saved", description: "You can now sign in with your email and password." });
    } catch (err: any) {
      toast({ title: "Failed to set password", description: err.message, variant: "destructive" });
    } finally {
      setExtPasswordSaving(false);
    }
  };
  

  // Saved state for cancel/revert
  const [savedFormData, setSavedFormData] = useState(formData);
  const [savedWork, setSavedWork] = useState(workExperiences);
  const [savedEdu, setSavedEdu] = useState(educations);
  const [savedCerts, setSavedCerts] = useState(certifications);

  const populateFromProfile = useCallback((p: any) => {
    const fd = {
      first_name: p.first_name || "", last_name: p.last_name || "",
      contact_email: p.contact_email || "",
      phone: p.phone || "", address: p.address || "",
      city: p.city || "", state: p.state || "", zip: p.zip || "", country: p.country || "",
      linkedin_url: p.linkedin_url || "", github_url: p.github_url || "",
      portfolio_url: p.portfolio_url || "",
      work_authorization: p.work_authorization || "", visa_status: p.visa_status || "",
      experience_years: p.experience_years ?? "",
      current_company: p.current_company || "", current_title: p.current_title || "",
      skills: (p.skills || []).join(", "),
      gender: p.gender || "", race_ethnicity: p.race_ethnicity || "",
      hispanic_latino: p.hispanic_latino || "",
      veteran_status: p.veteran_status || "",
      disability_status: p.disability_status || "",
      military_service: p.military_service || "",
    };
    setFormData(fd);
    setSavedFormData(fd);

    let we: WorkExperience[];
    const weRaw = p.work_experience;
    if (Array.isArray(weRaw) && weRaw.length > 0) we = weRaw;
    else if (p.current_title || p.current_company) {
      we = [{ title: p.current_title || "", company: p.current_company || "", start_date: "", end_date: "", is_current: true }];
    } else we = [{ ...emptyWork }];
    setWorkExperiences(we);
    setSavedWork(we);

    let edu: Education[];
    const eduRaw = p.education;
    if (Array.isArray(eduRaw) && eduRaw.length > 0) edu = eduRaw;
    else edu = [{ ...emptyEdu }];
    setEducations(edu);
    setSavedEdu(edu);

    const certsRaw = p.certifications;
    const c: Certification[] = Array.isArray(certsRaw) ? certsRaw.map((cert: any) => ({
      name: cert.name || "", issuer: cert.issuer || "",
      date_obtained: cert.date_obtained || "", expiration_date: cert.expiration_date || "",
    })) : [];
    setCertifications(c);
    setSavedCerts(c);
  }, []);

  useEffect(() => {
    // Don't overwrite form if user is actively editing (e.g. after resume autofill triggers a profile refetch)
    if (isEditing) return;
    if (profile) populateFromProfile(profile);
  }, [profile, populateFromProfile, isEditing]);

  // Browser beforeunload warning
  useEffect(() => {
    if (!isEditing || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditing, isDirty]);

  if (authLoading) {
    return (<div className="min-h-screen bg-background"><Header /><main className="container max-w-3xl mx-auto px-4 py-8"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-96 w-full" /></main></div>);
  }
  if (!user) return <Navigate to="/auth" replace />;

  const set = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsDirty(false);
  };

  const handleCancel = () => {
    setFormData(savedFormData);
    setWorkExperiences(savedWork);
    setEducations(savedEdu);
    setCertifications(savedCerts);
    setIsEditing(false);
    setIsDirty(false);
  };

  const handleSave = () => {
    const skillsArray = formData.skills ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const currentWork = workExperiences.find((w) => w.is_current);
    updateProfile({
      first_name: formData.first_name || null, last_name: formData.last_name || null,
      full_name: [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null,
      contact_email: formData.contact_email || null,
      phone: formData.phone || null, address: formData.address || null,
      city: formData.city || null, state: formData.state || null, zip: formData.zip || null,
      country: formData.country || null,
      location: [formData.city, formData.state].filter(Boolean).join(", ") || null,
      linkedin_url: formData.linkedin_url || null, github_url: formData.github_url || null,
      portfolio_url: formData.portfolio_url || null,
      work_authorization: formData.work_authorization || null, visa_status: formData.visa_status || null,
      experience_years: formData.experience_years ? Number(formData.experience_years) : null,
      current_company: currentWork?.company || formData.current_company || null,
      current_title: currentWork?.title || formData.current_title || null,
      skills: skillsArray,
      work_experience: workExperiences.filter((w) => w.title || w.company),
      education: educations.filter((e) => e.school || e.degree),
      certifications: certifications.filter((c) => c.name),
      gender: formData.gender || null, race_ethnicity: formData.race_ethnicity || null,
      hispanic_latino: formData.hispanic_latino || null, veteran_status: formData.veteran_status || null,
      disability_status: formData.disability_status || null, military_service: formData.military_service || null,
    } as any);
    // After save, update saved state and exit edit mode
    setSavedFormData(formData);
    setSavedWork(workExperiences);
    setSavedEdu(educations);
    setSavedCerts(certifications);
    setIsEditing(false);
    setIsDirty(false);

    // Trigger resume intelligence analysis in the background
    const filteredWork = workExperiences.filter((w) => w.title || w.company);
    const filteredEdu = educations.filter((e) => e.school || e.degree);
    if (skillsArray.length > 0 || filteredWork.length > 0) {
      analyzeResume({
        skills: skillsArray,
        workExperience: filteredWork,
        education: filteredEdu,
        currentTitle: currentWork?.title || formData.current_title || undefined,
        experienceYears: formData.experience_years ? Number(formData.experience_years) : undefined,
      });
    }
  };

  // Resume handlers - automatic parse + autofill + analyze on upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      // Temporarily exit edit mode so profile form can refresh with cleared fields
      setIsEditing(false);
      clearExtracted();
      lastResumeTextRef.current = "";
      setPendingExtracted(null);
      await uploadResume(file);
      // Parse the file we already have in memory — no need to re-download
      const extracted = await parseResume(file);
      if (extracted) {
        // Store a rough resume text summary for intelligence analysis
        const parts: string[] = [];
        if (extracted.summary) parts.push(extracted.summary);
        if (extracted.skills?.length) parts.push(`Skills: ${extracted.skills.join(", ")}`);
        if (extracted.work_experience?.length) parts.push(`Experience: ${extracted.work_experience.map(w => `${w.title} at ${w.company}`).join("; ")}`);
        if (extracted.education?.length) parts.push(`Education: ${extracted.education.map(e => `${e.degree || ""} ${e.major || ""} at ${e.school}`).join("; ")}`);
        lastResumeTextRef.current = parts.join("\n");
        buildReviewChanges(extracted);
      } else {
        // Parsing failed, so keep the just-uploaded resume as the source of truth
        // without reusing any stale fields from the previous resume.
      }
    } catch {
      // uploadResume already shows error toast
    }
  };

  const handleAutofillPromptYes = async () => {
    setShowAutofillPrompt(false);
    if (!profile?.resume_url && !user) return;
    handleAutofillExisting();
  };

  const handleAutofillPromptNo = () => {
    setShowAutofillPrompt(false);
  };

  const handleAutofillExisting = async () => {
    if (!profile?.resume_url || !user) return;
    setIsDownloadingResume(true);
    try {
      const { data, error } = await supabase.storage.from("resumes").download(profile.resume_url);
      if (error) throw error;
      const file = new File([data], profile.resume_filename || "resume.pdf", { type: data.type });
      const extracted = await parseResume(file);
      if (!extracted) return;
      buildReviewChanges(extracted);
    } catch (err: any) {
      toast({ title: "Failed to read resume", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const buildReviewChanges = (extracted: ExtractedResumeData) => {
    const changes: { label: string; field: string; oldValue: string; newValue: string }[] = [];
    const fieldMap: { field: string; label: string; extractedKey: keyof ExtractedResumeData; currentValue: string }[] = [
      { field: "first_name", label: "First Name", extractedKey: "first_name", currentValue: formData.first_name },
      { field: "last_name", label: "Last Name", extractedKey: "last_name", currentValue: formData.last_name },
      { field: "contact_email", label: "Contact Email", extractedKey: "email", currentValue: formData.contact_email },
      { field: "phone", label: "Phone", extractedKey: "phone", currentValue: formData.phone },
      { field: "city", label: "City", extractedKey: "city", currentValue: formData.city },
      { field: "state", label: "State", extractedKey: "state", currentValue: formData.state },
      { field: "zip", label: "ZIP Code", extractedKey: "zip", currentValue: formData.zip },
      { field: "address", label: "Address", extractedKey: "address", currentValue: formData.address },
      { field: "linkedin_url", label: "LinkedIn URL", extractedKey: "linkedin_url", currentValue: formData.linkedin_url },
      { field: "github_url", label: "GitHub URL", extractedKey: "github_url", currentValue: formData.github_url },
      { field: "portfolio_url", label: "Portfolio URL", extractedKey: "portfolio_url", currentValue: formData.portfolio_url },
    ];

    for (const fm of fieldMap) {
      const newVal = extracted[fm.extractedKey] as string | undefined;
      if (newVal && newVal !== fm.currentValue) {
        changes.push({ label: fm.label, field: fm.field, oldValue: fm.currentValue, newValue: newVal });
      }
    }

    if (extracted.skills && extracted.skills.length > 0) {
      const newSkills = extracted.skills.join(", ");
      if (newSkills !== formData.skills) changes.push({ label: "Skills", field: "skills", oldValue: formData.skills, newValue: newSkills });
    }
    if (extracted.experience_years != null) {
      const newVal = String(extracted.experience_years);
      const oldVal = String(formData.experience_years);
      if (newVal !== oldVal) changes.push({ label: "Years of Experience", field: "experience_years", oldValue: oldVal, newValue: newVal });
    }
    if (extracted.work_experience && extracted.work_experience.length > 0) {
      const summary = extracted.work_experience.map(w => `${w.title} @ ${w.company}`).join("; ");
      const oldSummary = workExperiences.filter(w => w.title || w.company).map(w => `${w.title} @ ${w.company}`).join("; ");
      if (summary !== oldSummary) changes.push({ label: "Work Experience", field: "work_experience", oldValue: oldSummary || "(empty)", newValue: summary });
    }
    if (extracted.education && extracted.education.length > 0) {
      const summary = extracted.education.map(e => `${e.degree || ""} ${e.major || ""} @ ${e.school}`).join("; ");
      const oldSummary = educations.filter(e => e.school || e.degree).map(e => `${e.degree} ${e.major} @ ${e.school}`).join("; ");
      if (summary !== oldSummary) changes.push({ label: "Education", field: "education", oldValue: oldSummary || "(empty)", newValue: summary });
    }
    if (extracted.certifications && extracted.certifications.length > 0) {
      const summary = extracted.certifications.map(c => c.name).join(", ");
      changes.push({ label: "Certifications", field: "certifications", oldValue: "", newValue: summary });
    }

    setPendingExtracted(extracted);
    // Directly apply without review dialog
    applyExtractedData(extracted);
  };

  const applyExtractedData = (e: ExtractedResumeData) => {
    const updates: Record<string, string> = {};
    const simpleFields = ["first_name", "last_name", "phone", "city", "state", "zip", "address", "linkedin_url", "github_url", "portfolio_url"] as const;
    if (e.email) updates["contact_email"] = e.email;
    for (const f of simpleFields) {
      if (e[f]) updates[f] = e[f] as string;
    }

    const nextSkills = Array.isArray(e.skills)
      ? e.skills.map((skill) => skill.trim()).filter(Boolean)
      : [];
    const mappedWork = Array.isArray(e.work_experience)
      ? e.work_experience.map((w) => ({
        title: w.title || "", company: w.company || "",
        start_date: w.start_date || "", end_date: w.end_date || "",
        is_current: w.is_current || false,
      }))
      : [];
    const mappedEdu = Array.isArray(e.education)
      ? e.education.map((ed) => ({
        school: ed.school || "", degree: ed.degree || "",
        major: ed.major || "", graduation_year: ed.graduation_year || "",
      }))
      : [];
    const mappedCerts = Array.isArray(e.certifications)
      ? e.certifications.map((c) => ({
        name: c.name || "", issuer: c.issuer || "",
        date_obtained: c.date_obtained || "", expiration_date: c.expiration_date || "",
      }))
      : [];
    const latestCurrentWork = mappedWork.find((w) => w.is_current) || mappedWork[0];
    const newWork = mappedWork.length > 0 ? mappedWork : [{ ...emptyWork }];
    const newEdu = mappedEdu.length > 0 ? mappedEdu : [{ ...emptyEdu }];
    const newCerts = mappedCerts;
    const clearedResumeFormData = {
      ...formData,
      first_name: "",
      last_name: "",
      contact_email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      linkedin_url: "",
      github_url: "",
      portfolio_url: "",
      experience_years: "",
      current_company: "",
      current_title: "",
      skills: "",
    };

    const newFormData = {
      ...clearedResumeFormData,
      ...updates,
      skills: nextSkills.join(", "),
      experience_years: e.experience_years ?? "",
      current_company: latestCurrentWork?.company || "",
      current_title: latestCurrentWork?.title || "",
    };

    setFormData(newFormData);
    setWorkExperiences(newWork);
    setEducations(newEdu);
    setCertifications(newCerts);

    // Auto-save to DB immediately so data persists across navigation
    const filteredWork = mappedWork.filter((w) => w.title || w.company);
    const filteredEdu = mappedEdu.filter((ed) => ed.school || ed.degree);
    const filteredCerts = mappedCerts.filter((c) => c.name);

    updateProfile({
      first_name: newFormData.first_name || null, last_name: newFormData.last_name || null,
      full_name: [newFormData.first_name, newFormData.last_name].filter(Boolean).join(" ") || null,
      contact_email: newFormData.contact_email || null,
      phone: newFormData.phone || null, address: newFormData.address || null,
      city: newFormData.city || null, state: newFormData.state || null, zip: newFormData.zip || null,
      location: [newFormData.city, newFormData.state].filter(Boolean).join(", ") || null,
      linkedin_url: newFormData.linkedin_url || null, github_url: newFormData.github_url || null,
      portfolio_url: newFormData.portfolio_url || null,
      work_authorization: newFormData.work_authorization || null, visa_status: newFormData.visa_status || null,
      experience_years: e.experience_years ?? null,
      current_company: latestCurrentWork?.company || null,
      current_title: latestCurrentWork?.title || null,
      skills: nextSkills,
      work_experience: filteredWork,
      education: filteredEdu,
      certifications: filteredCerts,
      gender: newFormData.gender || null, race_ethnicity: newFormData.race_ethnicity || null,
      hispanic_latino: newFormData.hispanic_latino || null, veteran_status: newFormData.veteran_status || null,
      disability_status: newFormData.disability_status || null, military_service: newFormData.military_service || null,
    } as any);

    // Update saved state so cancel reverts to this
    setSavedFormData(newFormData);
    setSavedWork(newWork);
    setSavedEdu(newEdu);
    setSavedCerts(newCerts);

    setIsEditing(true);
    setIsDirty(false);
    toast({ title: "Profile auto-filled & saved", description: "Resume data has been applied and saved to your profile." });

    // Trigger resume intelligence analysis in the background
    if (nextSkills.length > 0 || filteredWork.length > 0) {
      analyzeResume({
        resumeText: lastResumeTextRef.current || undefined,
        skills: nextSkills,
        workExperience: filteredWork,
        education: filteredEdu,
        currentTitle: latestCurrentWork?.title || undefined,
        experienceYears: e.experience_years ?? undefined,
      }).then(() => {
        // After analysis completes, send recommendation email for new resume
        // Clear the old "remind" key so the "rec" email fires
        if (user) {
          localStorage.removeItem(`sociax_resume_email_sent_${user.id}_remind`);
          localStorage.removeItem(`sociax_resume_email_sent_${user.id}_rec`);
        }
        supabase.auth.getSession().then(({ data: session }) => {
          if (session?.session?.access_token) {
            supabase.functions.invoke("send-resume-email", {
              headers: { Authorization: `Bearer ${session.session.access_token}` },
            }).catch(() => {});
          }
        });
      });
    }
  };

  // Helpers
  const updateWork = (i: number, f: keyof WorkExperience, v: string | boolean) => { setWorkExperiences(p => p.map((w, idx) => idx === i ? { ...w, [f]: v } : w)); setIsDirty(true); };
  const addWork = () => { setWorkExperiences(p => [...p, { ...emptyWork }]); setIsDirty(true); };
  const removeWork = (i: number) => { if (workExperiences.length > 1) { setWorkExperiences(p => p.filter((_, idx) => idx !== i)); setIsDirty(true); } };
  const updateEdu = (i: number, f: keyof Education, v: string) => { setEducations(p => p.map((e, idx) => idx === i ? { ...e, [f]: v } : e)); setIsDirty(true); };
  const addEdu = () => { setEducations(p => [...p, { ...emptyEdu }]); setIsDirty(true); };
  const removeEdu = (i: number) => { if (educations.length > 1) { setEducations(p => p.filter((_, idx) => idx !== i)); setIsDirty(true); } };
  const updateCert = (i: number, f: keyof Certification, v: string) => { setCertifications(p => p.map((c, idx) => idx === i ? { ...c, [f]: v } : c)); setIsDirty(true); };
  const addCert = () => { setCertifications(p => [...p, { ...emptyCert }]); setIsDirty(true); };
  const removeCert = (i: number) => { setCertifications(p => p.filter((_, idx) => idx !== i)); setIsDirty(true); };

  // Fields are read-only until the user clicks the Edit (pencil) button.
  // When editing, a sticky Save/Cancel bar appears at the bottom.
  const disabled = !isEditing;

   return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 relative">
      <ParticleField interactive={false} className="opacity-30" />
      <Header />
      <main className="container max-w-6xl mx-auto px-4 py-8 relative z-10">
        <ProfileCompletionBanner force />
        {/* Bento welcome section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <ProfileWelcomeBanner />
          <SkillsCloudWidget className="md:col-span-2" />
          
          <ResumeIntelligenceCard
            intelligence={profile?.resume_intelligence ?? null}
            isAnalyzing={isAnalyzing}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <ProfileAvatar size="md" showPicker={true} />
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          </div>
          {!isEditing && !isLoading && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Edit Profile
            </Button>
          )}
        </div>
        {/* Two-column layout: form left, ATS right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left column - Form */}
          <div className="space-y-6">
          {/* 1. Resume Upload / Auto-Fill */}
          <Card className="border-primary/20 bg-primary/5 rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Start by Uploading Your Resume</CardTitle>
              </div>
              <CardDescription>Upload your resume to automatically fill your profile details.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-24 w-full" /> : (
                <div className="space-y-4">
                  <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileUpload} className="hidden" />

                  {profile?.resume_filename ? (
                    <>
                      <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{profile.resume_filename}</p>
                            <p className="text-sm text-muted-foreground">Uploaded resume</p>
                          </div>
                        </div>
                       <Button variant="outline" size="sm" className="rounded-full" onClick={downloadResume}>
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAutofillExisting} disabled={isParsing || isDownloadingResume} className="flex-1 rounded-full">
                          {isParsing || isDownloadingResume ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing Resume...</> : <><Wand2 className="h-4 w-4 mr-2" />Auto-fill from Resume</>}
                        </Button>
                        <Button variant="outline" className="rounded-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isParsing}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Re-upload</>}
                        </Button>
                        <Button variant="ghost" onClick={deleteResume} className="text-destructive hover:text-destructive rounded-full">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors">
                      {isUploading || isParsing ? (
                        <><Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-3" /><p className="text-muted-foreground">{isParsing ? "Parsing..." : "Uploading..."}</p></>
                      ) : (
                        <><Upload className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-medium text-foreground">Click to upload resume</p><p className="text-sm text-muted-foreground mt-1">PDF, DOC, or DOCX — will auto-fill your profile</p></>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>


          {/* 2. Personal Details */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Personal Details</CardTitle>
              </div>
              <CardDescription>Name, contact, and address details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input id="first_name" placeholder="John" value={formData.first_name} onChange={(e) => set("first_name", e.target.value)} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input id="last_name" placeholder="Doe" value={formData.last_name} onChange={(e) => set("last_name", e.target.value)} disabled={disabled} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input id="contact_email" placeholder="email@example.com" value={formData.contact_email} onChange={(e) => set("contact_email", e.target.value)} disabled={disabled} />
                      <p className="text-xs text-muted-foreground">Used for job applications and autofill</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => set("phone", e.target.value)} disabled={disabled} />
                    </div>
                  </div>
                  {formData.contact_email && formData.contact_email !== (profile?.email || user.email || "") && (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-2 rounded">
                      Job applications will use <strong>{formData.contact_email}</strong>. Your account uses <strong>{profile?.email || user.email}</strong>.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <LocationAutocomplete
                      id="address"
                      value={formData.address}
                      onChange={(v) => set("address", v)}
                      onSelect={(parts: LocationParts) => {
                        // Atomically fill all location fields from the chosen suggestion.
                        // Country is only set if it matches our allowed list.
                        const matchedCountry = countries.find(
                          (c) => c.toLowerCase() === parts.country.toLowerCase()
                        );
                        setFormData((prev) => ({
                          ...prev,
                          address: parts.address || prev.address,
                          city: parts.city || prev.city,
                          state: parts.state || prev.state,
                          zip: parts.zip || prev.zip,
                          country: matchedCountry || prev.country,
                        }));
                        setIsDirty(true);
                      }}
                      placeholder="Start typing your address…"
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Type a few characters and pick a suggestion to autofill City, State, ZIP, and Country.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="San Francisco" value={formData.city} onChange={(e) => set("city", e.target.value)} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" placeholder="CA" value={formData.state} onChange={(e) => set("state", e.target.value)} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input id="zip" placeholder="94102" value={formData.zip} onChange={(e) => set("zip", e.target.value)} disabled={disabled} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={formData.country || undefined} onValueChange={(v) => set("country", v)} disabled={disabled}>
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used to personalize your job feed (e.g. visa-sponsorship matches for US-based jobs).
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 3. Professional Links */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Professional Links</CardTitle>
              </div>
              <CardDescription>LinkedIn, GitHub, and portfolio URLs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input id="linkedin" placeholder="https://linkedin.com/in/username" value={formData.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} disabled={disabled} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub URL</Label>
                      <Input id="github" placeholder="https://github.com/username" value={formData.github_url} onChange={(e) => set("github_url", e.target.value)} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio URL</Label>
                      <Input id="portfolio" placeholder="https://mysite.com" value={formData.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} disabled={disabled} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 4. Work Experience */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Work Experience</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">Add your work history with dates</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={addWork} type="button"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  {workExperiences.map((work, idx) => (
                    <div key={idx} className="space-y-4 p-4 rounded-lg border border-border bg-secondary/20 relative">
                      {workExperiences.length > 1 && (
                        <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => removeWork(idx)} type="button">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Job Title</Label><Input placeholder="Software Engineer" value={work.title} onChange={(e) => updateWork(idx, "title", e.target.value)} disabled={disabled} /></div>
                        <div className="space-y-2"><Label>Company</Label><Input placeholder="Acme Inc." value={work.company} onChange={(e) => updateWork(idx, "company", e.target.value)} disabled={disabled} /></div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Start Date</Label><Input type="month" value={work.start_date} onChange={(e) => updateWork(idx, "start_date", e.target.value)} disabled={disabled} /></div>
                        <div className="space-y-2"><Label>End Date</Label><Input type="month" value={work.end_date} onChange={(e) => updateWork(idx, "end_date", e.target.value)} disabled={disabled || work.is_current} placeholder={work.is_current ? "Present" : ""} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`current-${idx}`} checked={work.is_current} onCheckedChange={(checked) => updateWork(idx, "is_current", !!checked)} disabled={disabled} />
                        <Label htmlFor={`current-${idx}`} className="text-sm cursor-pointer">I currently work here</Label>
                      </div>
                    </div>
                  ))}
                  <div className="grid gap-4 sm:grid-cols-3 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="experience_years">Years of Experience</Label>
                      <Input id="experience_years" type="number" min={0} placeholder="5" value={formData.experience_years} onChange={(e) => set("experience_years", e.target.value)} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                      <Label>Work Authorization</Label>
                      <Select value={formData.work_authorization} onValueChange={(v) => set("work_authorization", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{WORK_AUTH_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Visa Sponsorship</Label>
                      <Select value={formData.visa_status} onValueChange={(v) => set("visa_status", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{VISA_STATUS_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 5. Education */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Education</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">Add your education history</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={addEdu} type="button"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  {educations.map((edu, idx) => (
                    <div key={idx} className="space-y-4 p-4 rounded-lg border border-border bg-secondary/20 relative">
                      {educations.length > 1 && (
                        <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => removeEdu(idx)} type="button"><Trash2 className="h-4 w-4" /></Button>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>School / University</Label><Input placeholder="MIT" value={edu.school} onChange={(e) => updateEdu(idx, "school", e.target.value)} disabled={disabled} /></div>
                        <div className="space-y-2"><Label>Degree</Label><Input placeholder="Bachelor's" value={edu.degree} onChange={(e) => updateEdu(idx, "degree", e.target.value)} disabled={disabled} /></div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Major / Field of Study</Label><Input placeholder="Computer Science" value={edu.major} onChange={(e) => updateEdu(idx, "major", e.target.value)} disabled={disabled} /></div>
                        <div className="space-y-2"><Label>Graduation Year</Label><Input placeholder="2023" value={edu.graduation_year} onChange={(e) => updateEdu(idx, "graduation_year", e.target.value)} disabled={disabled} /></div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* 6. Skills */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Skills</CardTitle>
              </div>
              <CardDescription>Comma-separated list of your key skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <Skeleton className="h-10 w-full" /> : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills</Label>
                    <Input id="skills" placeholder="React, TypeScript, Node.js, AWS" value={formData.skills} onChange={(e) => set("skills", e.target.value)} disabled={disabled} />
                  </div>
                  {formData.skills && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.split(",").map((s) => s.trim()).filter(Boolean).map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 7. Certifications */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Certifications</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">Professional certifications (optional)</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={addCert} type="button"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No certifications added. Click "Add" to add one.</p>
              ) : (
                certifications.map((cert, idx) => (
                  <div key={idx} className="space-y-4 p-4 rounded-lg border border-border bg-secondary/20 relative">
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => removeCert(idx)} type="button"><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>Certification Name</Label><Input placeholder="AWS Solutions Architect" value={cert.name} onChange={(e) => updateCert(idx, "name", e.target.value)} disabled={disabled} /></div>
                      <div className="space-y-2"><Label>Issuer</Label><Input placeholder="Amazon Web Services" value={cert.issuer} onChange={(e) => updateCert(idx, "issuer", e.target.value)} disabled={disabled} /></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>Date Obtained</Label><Input type="month" value={cert.date_obtained} onChange={(e) => updateCert(idx, "date_obtained", e.target.value)} disabled={disabled} /></div>
                      <div className="space-y-2"><Label>Expiration Date (optional)</Label><Input type="month" value={cert.expiration_date} onChange={(e) => updateCert(idx, "expiration_date", e.target.value)} disabled={disabled} /></div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 8. EEO / Demographics */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Equal Opportunity (Optional)</CardTitle>
              </div>
              <CardDescription>Voluntary self-identification — used for autofill on job applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => set("gender", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{GENDER_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Race / Ethnicity</Label>
                      <Select value={formData.race_ethnicity} onValueChange={(v) => set("race_ethnicity", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{RACE_ETHNICITY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Hispanic or Latino</Label>
                      <Select value={formData.hispanic_latino} onValueChange={(v) => set("hispanic_latino", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{HISPANIC_LATINO_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veteran Status</Label>
                      <Select value={formData.veteran_status} onValueChange={(v) => set("veteran_status", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{VETERAN_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Disability Status</Label>
                      <Select value={formData.disability_status} onValueChange={(v) => set("disability_status", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{DISABILITY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Have you served in the military?</Label>
                      <Select value={formData.military_service} onValueChange={(v) => set("military_service", v)} disabled={disabled}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{MILITARY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* PROMO: app is free for everyone — Subscription & Billing card hidden */}
          {/* <SubscriptionBillingCard /> */}

          {/* Email Notification Preferences */}
          <EmailNotificationPrefsCard userId={user.id} />

          {/* Account / Security */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Account / Security</CardTitle>
              </div>
              <CardDescription>Login and billing email (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_email">Account Email</Label>
                <Input id="account_email" value={profile?.email || user.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Used for login, authentication, and billing. Cannot be changed here.</p>
              </div>
            </CardContent>
          </Card>

          {/* Floating Save / Cancel toggle pill */}
          {isEditing && (
            <div className="sticky bottom-6 z-30 flex justify-center pointer-events-none">
              <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/95 backdrop-blur shadow-xl p-1 animate-scale-in">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Password sign-in for Google users */}
          {isGoogleOnlyUser && (!hasPasswordLogin || extPasswordSet) && (
            <Card className="rounded-3xl border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Password sign-in</CardTitle>
                </div>
                <CardDescription>
                  You signed in with Google. Create a password once so you can also sign in with your email and password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {extPasswordSet ? (
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <Check className="h-4 w-4" />
                    Password saved successfully. You can now sign in with your email and password.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input
                          type={showExtPassword ? "text" : "password"}
                          value={extPassword}
                          onChange={(e) => setExtPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="pr-10"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowExtPassword(!showExtPassword)}>
                          {showExtPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input
                        type="password"
                        value={extConfirmPassword}
                        onChange={(e) => setExtConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                    <Button onClick={handleSetExtensionPassword} disabled={extPasswordSaving || !extPassword} className="rounded-full">
                      {extPasswordSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Password"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Change Password */}
          <ChangePasswordCard email={profile?.email || user.email || ""} />

          {/* Danger Zone — Delete Account */}
          <DeleteAccountCard />

          {/* Debug Role Section - only visible to founder/admin */}
          {showRoleDebug && (
          <Card className="border-dashed border-accent/50 bg-accent/5 rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg text-accent-foreground">Debug: Role Information</CardTitle>
              </div>
              <CardDescription>Temporary debug section - shows your current role(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roleLoading ? <Skeleton className="h-8 w-32" /> : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Effective Role:</span>
                    <Badge variant={debugDisplayRole === "founder" ? "default" : "secondary"}>{debugDisplayRole}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">All Assigned Roles:</span>
                    {allRoles && allRoles.length > 0 ? allRoles.map((r, i) => <Badge key={i} variant="outline" className="text-xs">{r.role}</Badge>) : <Badge variant="outline">user (default)</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">User ID: {user?.id}</div>
                </>
              )}
            </CardContent>
          </Card>
          )}
          </div>

          {/* Right column - ATS Panel (sticky) */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <ProfileAtsPanel formProfile={{
                skills: formData.skills ? formData.skills.split(",").map(s => s.trim()).filter(Boolean) : null,
                experience_years: formData.experience_years ? Number(formData.experience_years) : null,
                current_title: formData.current_title || null,
                current_company: formData.current_company || null,
                work_experience: workExperiences.filter(w => w.title || w.company),
                education: educations.filter(e => e.school || e.degree),
                certifications: certifications.filter(c => c.name),
              }} />
            </div>
          </div>

          {/* Mobile ATS - shown below form on small screens */}
          <div className="lg:hidden">
            <ProfileAtsPanel formProfile={{
              skills: formData.skills ? formData.skills.split(",").map(s => s.trim()).filter(Boolean) : null,
              experience_years: formData.experience_years ? Number(formData.experience_years) : null,
              current_title: formData.current_title || null,
              current_company: formData.current_company || null,
              work_experience: workExperiences.filter(w => w.title || w.company),
              education: educations.filter(e => e.school || e.degree),
              certifications: certifications.filter(c => c.name),
            }} />
          </div>
        </div>
      </main>

      <AlertDialog open={showAutofillPrompt} onOpenChange={setShowAutofillPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-fill profile from resume?</AlertDialogTitle>
            <AlertDialogDescription>
              Your resume was uploaded successfully. Would you like to extract details and auto-fill your profile?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAutofillPromptNo}>No, thanks</AlertDialogCancel>
            <AlertDialogAction onClick={handleAutofillPromptYes}>
              <Wand2 className="h-4 w-4 mr-1" /> Yes, auto-fill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function EmailNotificationPrefsCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["my-email-prefs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updatePref = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from("email_notification_preferences")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-email-prefs", userId] }),
  });

  const toggle = (key: string, value: boolean) => {
    const updates: Record<string, any> = { [key]: value };
    if (key === "daily_digest_enabled") {
      updates.unsubscribed_at = value ? null : new Date().toISOString();
    }
    updatePref.mutate(updates);
  };

  if (isLoading) return <Card className="rounded-3xl p-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></Card>;

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Email Notifications</CardTitle>
        </div>
        <CardDescription>Manage your daily job digest and notification preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Daily Job Digest</p>
              <p className="text-xs text-muted-foreground">Receive new job listings every morning</p>
            </div>
          </div>
          <Switch checked={prefs?.daily_digest_enabled ?? true} onCheckedChange={(v) => toggle("daily_digest_enabled", v)} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Skill-Matched Jobs</p>
              <p className="text-xs text-muted-foreground">Jobs that match your profile skills</p>
            </div>
          </div>
          <Switch checked={prefs?.matched_jobs_enabled ?? true} onCheckedChange={(v) => toggle("matched_jobs_enabled", v)} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Visa Sponsorship Alerts</p>
              <p className="text-xs text-muted-foreground">New jobs offering visa sponsorship</p>
            </div>
          </div>
          <Switch checked={prefs?.sponsorship_jobs_enabled ?? true} onCheckedChange={(v) => toggle("sponsorship_jobs_enabled", v)} />
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteAccountCard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({ title: "Account deleted", description: "Your account and data have been removed." });
      await signOut();
      window.location.href = "/";
    } catch (e) {
      toast({
        title: "Failed to delete account",
        description: (e as Error).message || "Please try again or contact support.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="rounded-3xl border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg text-destructive">Delete Account</CardTitle>
          </div>
          <CardDescription>
            Permanently delete your account, profile, applications, saved jobs, and all related data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="rounded-full" onClick={() => setOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={open} onOpenChange={(v) => { if (!deleting) { setOpen(v); setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your profile, resume, applications, saved jobs, and subscription data. This action is irreversible.
              <br /><br />
              Type <span className="font-semibold text-destructive">DELETE</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            disabled={deleting}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


function ChangePasswordCard({ email }: { email: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setShowCurrent(false); setShowNew(false);
  };

  const handleSave = async () => {
    if (newPwd.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "Account email missing", variant: "destructive" });
      return;
    }
    setSaving(true);
    // Verify current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
    if (signInErr) {
      setSaving(false);
      toast({ title: "Current password is incorrect", variant: "destructive" });
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPwd });
    setSaving(false);
    if (updErr) {
      toast({ title: "Failed to update password", description: updErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "Your password was changed successfully." });
    setOpen(false);
    reset();
  };

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Change Password</CardTitle>
        </div>
        <CardDescription>Update your account password. You'll need your current password to confirm.</CardDescription>
      </CardHeader>
      <CardContent>
        {!open ? (
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Change password
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter your current password"
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min 6 characters"
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !currentPwd || !newPwd} className="rounded-full">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…</> : "Update password"}
              </Button>
              <Button variant="ghost" className="rounded-full" onClick={() => { setOpen(false); reset(); }} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
