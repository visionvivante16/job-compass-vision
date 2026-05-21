import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESUME_TEMPLATES, ResumeTemplateId, DEFAULT_TEMPLATE_ID } from "@/lib/resumeTemplates";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (templateId: ResumeTemplateId) => void;
}

const TEMPLATE_META: Record<ResumeTemplateId, {
  tagText: string;
  tagBg: string;
  bestFor: string;
}> = {
  classic: {
    tagText: "Traditional",
    tagBg: "#0b1f3a",
    bestFor: "📋 Best for Finance · Law · Consulting · Government",
  },
  modern: {
    tagText: "Contemporary",
    tagBg: "hsl(174 72% 42%)",
    bestFor: "💻 Best for Tech · Product · Design · Startups",
  },
  compact: {
    tagText: "Information-Dense",
    tagBg: "#475569",
    bestFor: "📊 Best for Engineering · Data · Multiple Roles",
  },
};

export function ResumeTemplateSelector({ open, onOpenChange, onConfirm }: Props) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const stored = (profile as any)?.preferred_resume_template as ResumeTemplateId | undefined;
  const [selected, setSelected] = useState<ResumeTemplateId>(stored || DEFAULT_TEMPLATE_ID);

  useEffect(() => {
    if (stored) setSelected(stored);
  }, [stored]);

  const hasResume = !!(profile?.resume_url || profile?.resume_filename);

  const handleConfirm = async () => {
    if (user) {
      supabase
        .from("profiles")
        .update({ preferred_resume_template: selected } as any)
        .eq("user_id", user.id)
        .then(() => {});
    }
    onConfirm(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-w-[96vw]">
        {!hasResume ? (
          <>
            <DialogHeader>
              <DialogTitle>Upload your resume first</DialogTitle>
              <DialogDescription>
                Your tailored resume is built from your real experience — we need your resume
                to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/profile");
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume Now
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Choose a resume template</DialogTitle>
              <DialogDescription>
                Pick the style that best fits the role. You can change it next time.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {(Object.values(RESUME_TEMPLATES) as Array<typeof RESUME_TEMPLATES[ResumeTemplateId]>).map((t) => {
                const isSel = selected === t.id;
                const meta = TEMPLATE_META[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={cn(
                      "relative text-left rounded-xl border-2 bg-card overflow-hidden transition-all hover:shadow-md",
                      isSel
                        ? "border-[hsl(174_72%_42%)] shadow-[0_0_0_4px_hsl(174_72%_42%/0.18)]"
                        : "border-border",
                    )}
                  >
                    {isSel && (
                      <div className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-[hsl(174_72%_42%)] text-white flex items-center justify-center animate-in zoom-in-50 duration-200">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </div>
                    )}

                    <div className="p-3 pb-2">
                      <Mockup id={t.id} />
                    </div>

                    <div className="px-3 pb-2">
                      <div className="font-semibold text-sm">{t.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t.tagline}
                      </div>
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                        ATS Score ★★★★★
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                        {meta.bestFor}
                      </div>
                    </div>

                    <div
                      className="text-center text-[11px] font-semibold text-white py-1.5 tracking-wide"
                      style={{ background: meta.tagBg }}
                    >
                      {meta.tagText}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                <FileText className="h-4 w-4 mr-2" />
                Continue with {RESUME_TEMPLATES[selected].label} →
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const TEAL = "hsl(174 72% 42%)";

function Mockup({ id }: { id: ResumeTemplateId }) {
  if (id === "classic") {
    return (
      <div
        className="bg-white aspect-[3/4] rounded border border-neutral-200 p-3 flex flex-col gap-1.5 shadow-inner"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {/* Name */}
        <div className="h-2.5 w-3/4 mx-auto bg-black rounded-[1px]" />
        <div className="h-[3px] w-1/2 mx-auto bg-neutral-400 rounded-sm" />
        <div className="h-px bg-black mt-1" />

        {/* EXPERIENCE */}
        <div className="mt-1">
          <div className="text-[6px] font-bold tracking-[0.15em] text-black">EXPERIENCE</div>
          <div className="h-[3px] w-2/5 bg-black rounded-sm mt-1" />
          <div className="space-y-[3px] mt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="h-px w-1 bg-neutral-500" />
                <div className={cn("h-[2px] bg-neutral-400 rounded-sm", i === 3 ? "w-4/5" : "w-full")} />
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-neutral-300 mt-1" />

        {/* EDUCATION */}
        <div>
          <div className="text-[6px] font-bold tracking-[0.15em] text-black">EDUCATION</div>
          <div className="space-y-[3px] mt-1">
            <div className="h-[2px] w-3/4 bg-neutral-400 rounded-sm" />
            <div className="h-[2px] w-1/2 bg-neutral-400 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (id === "modern") {
    return (
      <div className="bg-white aspect-[3/4] rounded border border-neutral-200 p-3 flex flex-col gap-1.5 shadow-inner">
        {/* Top accent + name */}
        <div className="h-[3px] w-8 rounded-sm" style={{ background: TEAL }} />
        <div className="h-3 w-2/3 bg-neutral-800 rounded-sm" />
        <div className="h-[3px] w-1/2 bg-neutral-400 rounded-sm" />

        {/* Experience */}
        <div className="mt-1.5">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-[3px] rounded-sm" style={{ background: TEAL }} />
            <div className="text-[7px] font-semibold text-neutral-800">Experience</div>
          </div>
          <div className="ml-2 mt-1">
            <div className="h-[3px] w-3/5 bg-neutral-700 rounded-sm" />
            <div className="h-[2px] w-2/5 bg-neutral-400 rounded-sm mt-[3px]" />
            <div className="space-y-[3px] mt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="h-[3px] w-[3px] rounded-[1px]" style={{ background: TEAL }} />
                  <div className={cn("h-[2px] bg-neutral-300 rounded-sm", i === 3 ? "w-4/5" : "w-full")} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="mt-1">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-[3px] rounded-sm" style={{ background: TEAL }} />
            <div className="text-[7px] font-semibold text-neutral-800">Skills</div>
          </div>
          <div className="flex flex-wrap gap-1 ml-2 mt-1">
            {[10, 8, 12, 9].map((w, i) => (
              <div
                key={i}
                className="h-2 rounded-full"
                style={{ width: `${w}px`, background: TEAL, opacity: 0.85 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // compact
  return (
    <div
      className="bg-white aspect-[3/4] rounded border border-neutral-200 p-2 flex flex-col gap-[3px] shadow-inner"
      style={{ fontFamily: "Calibri, Arial, sans-serif" }}
    >
      <div className="h-2 w-1/2 bg-neutral-900 rounded-sm" />
      <div className="h-[2px] w-2/5 bg-neutral-500 rounded-sm" />
      <div className="h-px bg-neutral-300 mt-[2px]" />

      <div>
        <div className="text-[6px] font-bold text-neutral-800">EXPERIENCE</div>
        <div className="h-[2px] w-2/5 bg-neutral-700 rounded-sm mt-[2px]" />
        <div className="space-y-[1.5px] mt-[2px]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-px w-[2px] bg-neutral-500" />
              <div className={cn("h-[1.5px] bg-neutral-400 rounded-sm", i === 5 ? "w-3/4" : "w-full")} />
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-neutral-300" />

      <div>
        <div className="text-[6px] font-bold text-neutral-800">PROJECTS</div>
        <div className="space-y-[1.5px] mt-[2px]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-px w-[2px] bg-neutral-500" />
              <div className={cn("h-[1.5px] bg-neutral-400 rounded-sm", i === 4 ? "w-2/3" : "w-full")} />
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-neutral-300" />

      <div>
        <div className="text-[6px] font-bold text-neutral-800">SKILLS</div>
        <div className="space-y-[1.5px] mt-[2px]">
          <div className="h-[1.5px] w-full bg-neutral-400 rounded-sm" />
          <div className="h-[1.5px] w-5/6 bg-neutral-400 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
