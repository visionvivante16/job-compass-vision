import { createContext, useContext, ReactNode, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useApplications, useSavedJobs, useJobActions, useTotalApplicationCount } from "@/hooks/useJobStore";
import { useProfile } from "@/hooks/useProfile";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { Application, SavedJob, Job } from "@/types/job";
import { emitWidgetEvent } from "@/hooks/useWidgetTracker";
import { trackApplyClickForFeedback } from "@/hooks/useFeedbackPrompt";
import { openApplyLink } from "@/lib/openApplyLink";

interface JobContextType {
  applications: Application[];
  savedJobs: SavedJob[];
  isLoading: boolean;
  applyToJob: (job: any) => void;
  confirmApply: () => void;
  cancelApply: () => void;
  confirmPostApply: () => void;
  dismissPostApply: () => void;
  saveJob: (job: any) => void;
  unsaveJob: (jobId: string) => void;
  removeAppliedJob: (jobId: string) => void;
  updateApplicationStatus: (jobId: string, status: string) => void;
  updateSavedFolder: (jobId: string, folder: string) => void;
  isApplied: (jobId: string) => boolean;
  isSaved: (jobId: string) => boolean;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (open: boolean) => void;
  showApplyConfirm: boolean;
  showPostApplyConfirm: boolean;
  showProfileGate: boolean;
  setShowProfileGate: (open: boolean) => void;
  profileGateMissingFields: string[];
  pendingJobTitle: string;
  pendingJobCompany: string;
  totalAppCount: number;
  isPremium: boolean;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: savedJobs = [], isLoading: savedLoading } = useSavedJobs();
  const { data: totalAppCount = 0 } = useTotalApplicationCount();
  const { applyToJob: rawApply, saveJob: rawSave, unsaveJob, removeAppliedJob, updateApplicationStatus, updateSavedFolder } = useJobActions();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isComplete: profileComplete, missingFields: profileGateMissingFields } = useProfileComplete();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showPostApplyConfirm, setShowPostApplyConfirm] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);
  const [pendingJob, setPendingJob] = useState<Job | null>(null);
  // Track job that was clicked and is awaiting post-apply confirmation
  const [clickedJob, setClickedJob] = useState<Job | null>(null);
  const waitingForReturn = useRef(false);

  const appliedJobIds = useMemo(() => new Set(applications.map((a) => a.job_id)), [applications]);
  const savedJobIds = useMemo(() => new Set(savedJobs.map((s) => s.job_id)), [savedJobs]);

  const isApplied = useCallback((jobId: string) => appliedJobIds.has(jobId), [appliedJobIds]);
  const isSaved = useCallback((jobId: string) => savedJobIds.has(jobId), [savedJobIds]);

  // Listen for tab visibility change to show post-apply confirmation
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && waitingForReturn.current && clickedJob) {
        waitingForReturn.current = false;
        setShowPostApplyConfirm(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [clickedJob]);

  const applyToJob = useCallback(
    (job: any) => {
      if (!profileComplete) {
        setShowProfileGate(true);
        return;
      }
      // Promo: free 1 month for everyone — upgrade popup disabled until further notice
      // Show pre-apply confirmation dialog
      setPendingJob(job);
      setShowApplyConfirm(true);
    },
    [profile?.is_premium, profileLoading, totalAppCount, profileComplete],
  );

  // User confirms "Proceed & Apply" — insert clicked record + open link
  const confirmApply = useCallback(() => {
    if (pendingJob) {
      // Insert as 'clicked' status (counts toward free limit)
      rawApply(pendingJob, "clicked");
      emitWidgetEvent("apply");
      // Track for feedback prompt (3rd click triggers popup)
      trackApplyClickForFeedback();
      // Open external link (handles bad URLs and popup blockers)
      openApplyLink(pendingJob.external_apply_link);
      // Set up for post-apply confirmation on tab return
      setClickedJob(pendingJob);
      waitingForReturn.current = true;
    }
    setPendingJob(null);
    setShowApplyConfirm(false);
  }, [pendingJob, rawApply]);

  const cancelApply = useCallback(() => {
    setPendingJob(null);
    setShowApplyConfirm(false);
  }, []);

  // User confirms they applied — update status to 'applied'
  const confirmPostApply = useCallback(() => {
    if (clickedJob) {
      updateApplicationStatus(clickedJob.id, "applied");
    }
    setClickedJob(null);
    setShowPostApplyConfirm(false);
  }, [clickedJob, updateApplicationStatus]);

  // User says they didn't apply — keep as 'clicked' (still counts toward limit)
  const dismissPostApply = useCallback(() => {
    setClickedJob(null);
    setShowPostApplyConfirm(false);
  }, []);

  const saveJob = useCallback((job: any) => { rawSave(job); emitWidgetEvent("save"); }, [rawSave]);
  const isPremium = profileLoading ? true : (profile?.is_premium === true);

  const value = useMemo(() => ({
    applications,
    savedJobs,
    isLoading: appsLoading || savedLoading,
    applyToJob,
    confirmApply,
    cancelApply,
    confirmPostApply,
    dismissPostApply,
    saveJob,
    unsaveJob,
    removeAppliedJob,
    updateApplicationStatus,
    updateSavedFolder,
    isApplied,
    isSaved,
    showUpgradeDialog,
    setShowUpgradeDialog,
    showApplyConfirm,
    showPostApplyConfirm,
    showProfileGate,
    setShowProfileGate,
    profileGateMissingFields,
    pendingJobTitle: pendingJob?.title ?? clickedJob?.title ?? "",
    pendingJobCompany: pendingJob?.company ?? clickedJob?.company ?? "",
    totalAppCount,
    isPremium,
  }), [
    applications, savedJobs, appsLoading, savedLoading,
    applyToJob, confirmApply, cancelApply, confirmPostApply, dismissPostApply,
    saveJob, unsaveJob, removeAppliedJob, updateApplicationStatus, updateSavedFolder,
    isApplied, isSaved,
    showUpgradeDialog, showApplyConfirm, showPostApplyConfirm, showProfileGate, profileGateMissingFields,
    pendingJob, clickedJob, totalAppCount, isPremium,
  ]);

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJobContext() {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error("useJobContext must be used within a JobProvider");
  }
  return context;
}
