import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Download,
  FileDown,
  FileType,
  ClipboardCopy,
  Target,
  AlertCircle,
  Info,
  Sparkles,
  X,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTailoredResume } from "@/hooks/useTailoredResume";
import { useResumeStructure } from "@/hooks/useResumeStructure";
import { useAtsCheck } from "@/hooks/useAtsCheck";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import {
  EditableResume,
  buildEditableResume,
  countActiveChanges,
  extractKeywords,
  stripHtml,
} from "@/lib/resumeEditor";
import {
  exportResumeAsPdf,
  exportResumeAsDocx,
  exportResumeAsText,
  copyResumeToClipboard,
} from "@/lib/resumeExport";
import { ResumeCanvas } from "./resume-editor/ResumeCanvas";
import { ResumeTemplateSelector } from "./ResumeTemplateSelector";
import { TailoringProgress } from "./TailoringProgress";
import { TailoredResumeFeedback } from "./TailoredResumeFeedback";
import { ResumeTemplateId, DEFAULT_TEMPLATE_ID, RESUME_TEMPLATES } from "@/lib/resumeTemplates";

interface TailoredResumeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: {
    id: string;
    title: string;
    company: string;
    description?: string;
    skills?: string[];
  } | null;
}

export function TailoredResumeEditor({ open, onOpenChange, job }: TailoredResumeEditorProps) {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { generate, isGenerating, result, clearResult } = useTailoredResume();
  const { runCheck, isChecking } = useAtsCheck();
  const {
    structure,
    isLoading: isLoadingStructure,
    error: structureError,
    load: loadStructure,
    reset: resetStructure,
  } = useResumeStructure();

  const [resume, setResume] = useState<EditableResume | null>(null);
  const [originalResume, setOriginalResume] = useState<EditableResume | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [pageInfo, setPageInfo] = useState<{ current: number; total: number }>({ current: 1, total: 1 });
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [templateId, setTemplateId] = useState<ResumeTemplateId | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [viewMode, setViewMode] = useState<"tailored" | "original">("tailored");
  const [showFeedback, setShowFeedback] = useState(false);
  const lastGeneratedRef = useRef<typeof result>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const hasResume = !!(profile?.resume_url || profile?.resume_filename);
  const resumeVersion = `${profile?.updated_at || ""}::${profile?.resume_filename || ""}`;

  // Show template selector when dialog opens
  useEffect(() => {
    if (open && !templateId) setShowTemplateSelector(true);
  }, [open, templateId]);

  /* 1) Load the structured resume from the user's uploaded file (only after template chosen) */
  useEffect(() => {
    if (!open || !hasResume || !profile?.resume_url || !templateId) return;
    if (structure || isLoadingStructure) return;
    loadStructure({
      resume_path: profile.resume_url,
      filename: profile.resume_filename || undefined,
      cache_key: `${resumeVersion}`,
    });
  }, [open, hasResume, profile?.resume_url, profile?.resume_filename, structure, isLoadingStructure, loadStructure, resumeVersion, templateId]);

  /* 2) Once we have the structure + a job + template, kick off tailoring */
  useEffect(() => {
    if (!open || !job || !structure || !templateId) return;
    if (result || isGenerating) return;
    generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      company_name: job.company,
      resume_structure: structure,
      cache_key: `${job.id}::${resumeVersion}`,
    });
  }, [open, job, structure, result, isGenerating, generate, resumeVersion, templateId]);

  /* 3) Hydrate the editable resume + keep an "original" copy for toggle */
  useEffect(() => {
    if (!structure) return;
    setResume(buildEditableResume(structure, result, profile));
    if (!originalResume) {
      setOriginalResume(buildEditableResume(structure, null, profile));
    }
  }, [structure, result, profile, originalResume]);

  useEffect(() => {
    if (result) lastGeneratedRef.current = result;
  }, [result]);

  /* 4) Initial ATS match score */
  useEffect(() => {
    if (!open || !job || matchScore != null || isChecking || !profile) return;
    runCheck({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      formProfile: {
        skills: profile.skills,
        current_title: profile.current_title,
        current_company: profile.current_company,
        experience_years: profile.experience_years,
        work_experience: profile.work_experience as any,
        education: profile.education as any,
        certifications: profile.certifications as any,
      },
    }).then((res) => {
      if (res) setMatchScore(res.overall_score);
    });
  }, [open, job, matchScore, isChecking, profile, runCheck]);

  /* 5) Live debounced match-score recompute — only after user edits, not on
     the initial AI hydration. Skipped while still tailoring to avoid stacking
     redundant ATS calls on top of resume generation. */
  const isFirstResumeRef = useRef(true);
  useEffect(() => {
    if (!open || !job || !resume || !profile) return;
    if (isGenerating || isLoadingStructure) return;
    if (isFirstResumeRef.current) {
      isFirstResumeRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const flatBullets = resume.sections
        .filter((s) => s.visible)
        .flatMap((s) =>
          s.items.map((it) => ({
            title: it.heading,
            company: it.subheading,
            description: it.bullets.map((b) => stripHtml(b.text).trim()).filter(Boolean).join("\n"),
          })),
        );
      runCheck({
        job_title: job.title,
        job_description: job.description || "",
        job_skills: job.skills || [],
        formProfile: {
          skills: resume.visibility.skills ? resume.skills : [],
          current_title: profile.current_title,
          current_company: profile.current_company,
          experience_years: profile.experience_years,
          work_experience: flatBullets,
          education: profile.education as any,
          certifications: profile.certifications as any,
        },
      }).then((res) => {
        if (res) setMatchScore(res.overall_score);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [resume, open, job, profile, runCheck, isGenerating, isLoadingStructure]);

  /* 6) Reset on close / job change */
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        clearResult();
        resetStructure();
        setResume(null);
        setOriginalResume(null);
        setMatchScore(null);
        setTemplateId(null);
        setShowFeedback(false);
        setViewMode("tailored");
        isFirstResumeRef.current = true;
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, clearResult, resetStructure]);

  useEffect(() => {
    setMatchScore(null);
    setResume(null);
    setOriginalResume(null);
    clearResult();
    isFirstResumeRef.current = true;
  }, [job?.id, clearResult]);

  /* 7) Page count by canvas height */
  useEffect(() => {
    if (!resume) return;
    const el = canvasContainerRef.current?.querySelector("[data-resume-canvas]") as HTMLElement | null;
    if (!el) return;
    const measure = () => {
      const heightPx = el.scrollHeight;
      const widthPx = el.getBoundingClientRect().width;
      const pxPerIn = widthPx / 8.5;
      const pages = Math.max(1, Math.ceil(heightPx / (pxPerIn * 11)));
      setPageInfo({ current: 1, total: pages });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resume]);

  const keywords = useMemo(
    () => extractKeywords(job?.description || "", job?.skills || []),
    [job?.description, job?.skills],
  );

  const changesCount = useMemo(() => countActiveChanges(resume), [resume]);

  const handleDownload = (format: "pdf" | "docx" | "txt") => {
    if (!resume || !job) return;
    const tplId = templateId || DEFAULT_TEMPLATE_ID;
    if (format === "pdf") exportResumeAsPdf(resume, job.title, job.company, tplId);
    else if (format === "docx")
      exportResumeAsDocx(resume, job.title, job.company, tplId).catch(() =>
        toast({ title: "Download failed", description: "Could not generate Word file.", variant: "destructive" }),
      );
    else exportResumeAsText(resume, job.title, job.company);
    if (format === "pdf" || format === "docx") {
      setTimeout(() => setShowFeedback(true), 800);
    }
  };

  const handleCopy = async () => {
    if (!resume) return;
    const ok = await copyResumeToClipboard(resume);
    toast({
      title: ok ? "Copied to clipboard" : "Copy failed",
      description: ok ? "Plain text resume is on your clipboard." : "Please try again.",
      variant: ok ? "default" : "destructive",
    });
  };

  const handleRegenerate = async () => {
    if (!job || !structure) return;
    setConfirmRegenerate(false);
    setResume(null);
    const previousResult = result ?? lastGeneratedRef.current;
    clearResult();
    setMatchScore(null);
    isFirstResumeRef.current = true;
    await generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      company_name: job.company,
      resume_structure: structure,
      cache_key: `${job.id}::${resumeVersion}`,
      force: true,
      previous_result: previousResult,
    });
  };

  if (!job) return null;

  const isWorking = isLoadingStructure || isGenerating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-w-[96vw] max-h-[94vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-border/60 shrink-0 bg-background sticky top-0 z-20">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center">
                <Target className="h-4 w-4 text-foreground/70" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold truncate">
                  Tailored Resume — {job.title}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground truncate">{job.company}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {matchScore != null && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border"
                  style={{
                    backgroundColor: "hsl(174 72% 56% / 0.12)",
                    color: "hsl(174 72% 28%)",
                    borderColor: "hsl(174 72% 56% / 0.35)",
                  }}
                  title="Live ATS match score — updates as you edit"
                >
                  {isChecking && <Loader2 className="h-3 w-3 animate-spin opacity-70" />}
                  <span>Match score:</span>
                  <span className="font-bold tabular-nums">{matchScore}%</span>
                </span>
              )}

              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!resume || isGenerating || isLoadingStructure}
                      onClick={() => setConfirmRegenerate(true)}
                      className="h-8 rounded-lg"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Regenerate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Use your current tailored version as the baseline and regenerate a fresh one
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={!resume} className="h-8 rounded-lg">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                    <FileDown className="h-4 w-4 mr-2" /> Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("docx")}>
                    <FileType className="h-4 w-4 mr-2" /> Download as Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy}>
                    <ClipboardCopy className="h-4 w-4 mr-2" /> Copy as plain text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-lg"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary banner with toggle */}
          {resume && result && job && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[hsl(174_72%_56%/0.35)] bg-[hsl(174_72%_56%/0.08)] px-3 py-1.5">
              <div className="text-[11px] text-[hsl(174_72%_22%)] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="font-medium">✅ Resume tailored for {job.title} at {job.company}</span>
                <span>{changesCount} bullets rewritten</span>
                <span>{result.keywords_added?.length || 0} keywords added</span>
                {result.summary_changed && <span>Summary personalised</span>}
                {matchScore != null && <span>Match: {matchScore}%</span>}
                <span className="text-[hsl(174_72%_30%)]">Template: {RESUME_TEMPLATES[templateId || DEFAULT_TEMPLATE_ID].label}</span>
              </div>
              <div className="flex items-center gap-1 text-[10.5px]">
                <button
                  onClick={() => setViewMode("original")}
                  className={`px-2 py-0.5 rounded-md ${viewMode === "original" ? "bg-foreground text-background" : "bg-background border border-border"}`}
                >
                  View Original
                </button>
                <button
                  onClick={() => setViewMode("tailored")}
                  className={`px-2 py-0.5 rounded-md ${viewMode === "tailored" ? "bg-foreground text-background" : "bg-background border border-border"}`}
                >
                  View Tailored
                </button>
              </div>
            </div>
          )}
        </DialogHeader>

        <div
          ref={canvasContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-6"
          style={{ backgroundColor: "#f5f5f5" }}
        >
          {!hasResume ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-muted-foreground/60" />}
              title="Upload your resume first to use this feature"
              body="Your tailored resume is based on your real experience — we need your resume to get started."
              action={
                <Button size="sm" onClick={() => { onOpenChange(false); navigate("/profile"); }} className="mt-2">
                  <Upload className="h-3.5 w-3.5 mr-2" /> Upload Resume Now
                </Button>
              }
            />
          ) : structureError ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-destructive/70" />}
              title="Could not load your resume"
              body={structureError}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetStructure();
                    if (profile?.resume_url) {
                      loadStructure({
                        resume_path: profile.resume_url,
                        filename: profile.resume_filename || undefined,
                        cache_key: `${resumeVersion}::retry-${Date.now()}`,
                      });
                    }
                  }}
                  className="mt-2"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Try again
                </Button>
              }
            />
          ) : !templateId ? (
            <EmptyState
              icon={<Sparkles className="h-10 w-10 text-muted-foreground/60" />}
              title="Choose a template to begin"
              body="Pick a resume style for this role."
              action={
                <Button size="sm" onClick={() => setShowTemplateSelector(true)} className="mt-2">
                  Choose template
                </Button>
              }
            />
          ) : isWorking && !resume ? (
            <div className="relative overflow-hidden rounded-2xl border border-[hsl(174_72%_42%)]/20 mx-auto max-w-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[hsl(174_72%_18%)] shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(174_72%_42%/0.18),transparent_60%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(174_72%_55%/0.12),transparent_55%)] pointer-events-none" />
              <div className="relative">
                <TailoringProgress />
              </div>
            </div>
          ) : !resume ? (
            <EmptyState
              icon={<Loader2 className="h-10 w-10 text-accent animate-spin" />}
              title="Preparing editor…"
              body=""
            />
          ) : (
            <ResumeCanvas
              resume={viewMode === "original" && originalResume ? originalResume : resume}
              onChange={setResume}
              keywords={keywords}
              templateId={templateId}
            />
          )}
        </div>

        {/* Page indicator */}
        <div className="px-5 py-2 border-t border-border/60 bg-background flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span>
              Page {pageInfo.current} of {pageInfo.total}
            </span>
            {pageInfo.total > 2 && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Info className="h-3 w-3" />
                      Tip
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Tip — recruiters prefer resumes under 2 pages.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <span className="text-muted-foreground/70">
            Read-only preview. Use Download to get PDF or Word.
          </span>
        </div>
      </DialogContent>

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate tailored resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard any manual edits you've made and ask the AI for a fresh
              tailored version for this role. Your original resume on file is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResumeTemplateSelector
        open={showTemplateSelector}
        onOpenChange={(o) => {
          setShowTemplateSelector(o);
          if (!o && !templateId) onOpenChange(false);
        }}
        onConfirm={(id) => {
          setTemplateId(id);
          setShowTemplateSelector(false);
        }}
      />

      {showFeedback && job && (
        <TailoredResumeFeedback
          templateUsed={templateId || DEFAULT_TEMPLATE_ID}
          jobTitle={job.title}
          companyName={job.company}
          onDismiss={() => setShowFeedback(false)}
        />
      )}
    </Dialog>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-md border border-border/60 mx-auto max-w-2xl px-10 py-16 text-center flex flex-col items-center gap-3">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && <p className="text-xs text-muted-foreground max-w-sm">{body}</p>}
      {action}
    </div>
  );
}
