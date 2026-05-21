import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { InterviewPrepData } from "@/hooks/useInterviewPrep";
import { Loader2, Brain, MessageSquare, ChevronDown, Download, FileText, FileDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface InterviewPrepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prep: InterviewPrepData | null;
  isLoading: boolean;
  jobTitle: string;
  hasResume: boolean;
}

function CollapsibleAnswer({ answer }: { answer: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium mt-1.5 transition-colors"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        {expanded ? "Hide" : "Show"} answer
      </button>
      {expanded && (
        <p className="text-xs text-muted-foreground mt-1.5 pl-3 border-l-2 border-accent/30 leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const styles = {
    easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hard: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", styles[level as keyof typeof styles] || styles.medium)}>
      {level}
    </span>
  );
}

function prepToText(prep: InterviewPrepData, jobTitle: string): string {
  const lines: string[] = [];
  lines.push(`Interview Prep — ${jobTitle}`);
  lines.push("=".repeat(60));
  lines.push("");
  if (prep.technicalQuestions?.length) {
    lines.push("TECHNICAL QUESTIONS");
    lines.push("-".repeat(60));
    prep.technicalQuestions.forEach((q, i) => {
      lines.push(`${i + 1}. (${q.difficulty}) ${q.question}`);
      lines.push(`   Answer: ${q.suggestedAnswer}`);
      lines.push("");
    });
  }
  if (prep.behavioralQuestions?.length) {
    lines.push("");
    lines.push("BEHAVIORAL QUESTIONS");
    lines.push("-".repeat(60));
    prep.behavioralQuestions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.question}`);
      lines.push(`   Answer: ${q.suggestedAnswer}`);
      lines.push("");
    });
  }
  return lines.join("\n");
}

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadTxt(prep: InterviewPrepData, jobTitle: string) {
  const content = prepToText(prep, jobTitle);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Interview_Prep_${safeName(jobTitle)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPdf(prep: InterviewPrepData, jobTitle: string) {
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Please allow popups to download PDF");
    return;
  }
  const renderSection = (
    title: string,
    items: { question: string; suggestedAnswer: string; difficulty?: string }[]
  ) => {
    if (!items?.length) return "";
    return `<h2>${escapeHtml(title)}</h2>` + items
      .map(
        (q, i) => `
        <div class="q">
          <p class="qhead">${i + 1}. ${q.difficulty ? `<span class="diff ${escapeHtml(q.difficulty)}">${escapeHtml(q.difficulty)}</span>` : ""} ${escapeHtml(q.question)}</p>
          <p class="ans"><strong>Suggested answer:</strong> ${escapeHtml(q.suggestedAnswer)}</p>
        </div>`
      )
      .join("");
  };

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title> </title>
<style>
@page { margin: 0.75in; size: auto; }
@media print { html, body { -webkit-print-color-adjust: exact; } }
body{font-family:'Helvetica','Arial',sans-serif;font-size:11pt;line-height:1.55;max-width:720px;margin:0 auto;padding:32px;color:#1a1a1a;}
h1{font-size:18pt;margin:0 0 4px;}
h2{font-size:13pt;margin:24px 0 10px;border-bottom:1px solid #ddd;padding-bottom:4px;color:#0f3460;}
.sub{color:#666;font-size:10pt;margin-bottom:18px;}
.q{margin-bottom:14px;page-break-inside:avoid;}
.qhead{font-weight:600;margin:0 0 4px;}
.ans{margin:0;color:#333;font-size:10.5pt;}
.diff{display:inline-block;font-size:8pt;padding:1px 6px;border-radius:8px;margin-right:6px;text-transform:uppercase;letter-spacing:0.5px;}
.diff.easy{background:#dcfce7;color:#166534;}
.diff.medium{background:#fef3c7;color:#92400e;}
.diff.hard{background:#fee2e2;color:#991b1b;}
</style></head>
<body>
<h1>Interview Prep — ${escapeHtml(jobTitle)}</h1>
<p class="sub">Generated by Sociax</p>
${renderSection("Technical Questions", prep.technicalQuestions || [])}
${renderSection("Behavioral Questions", prep.behavioralQuestions || [])}
<script>
  document.title='';
  window.onload=function(){setTimeout(function(){window.print();},120);window.onafterprint=function(){window.close();}}
</script>
</body></html>`;
  win.document.write(html);
  win.document.close();
}

export function InterviewPrepDialog({ open, onOpenChange, prep, isLoading, jobTitle }: InterviewPrepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-accent" />
              Interview Prep — {jobTitle}
            </DialogTitle>
            {prep && !isLoading && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-full h-8 text-xs">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => downloadPdf(prep, jobTitle)}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadTxt(prep, jobTitle)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download as TXT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating questions…</p>
          </div>
        ) : prep ? (
          <ScrollArea className="max-h-[calc(85vh-80px)]">
            <div className="p-5 space-y-6">
              {prep.technicalQuestions?.length > 0 && (
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <Brain className="h-4 w-4 text-accent" /> Technical Questions
                  </h4>
                  <div className="space-y-3">
                    {prep.technicalQuestions.map((q, i) => (
                      <div key={i} className="rounded-lg border border-border/50 p-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground font-medium leading-snug">{q.question}</p>
                          <DifficultyBadge level={q.difficulty} />
                        </div>
                        <CollapsibleAnswer answer={q.suggestedAnswer} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {prep.behavioralQuestions?.length > 0 && (
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <MessageSquare className="h-4 w-4 text-accent" /> Behavioral Questions
                  </h4>
                  <div className="space-y-3">
                    {prep.behavioralQuestions.map((q, i) => (
                      <div key={i} className="rounded-lg border border-border/50 p-3 bg-card">
                        <p className="text-sm text-foreground font-medium leading-snug">{q.question}</p>
                        <CollapsibleAnswer answer={q.suggestedAnswer} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
