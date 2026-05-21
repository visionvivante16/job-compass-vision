import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCoverLetter } from "@/hooks/useCoverLetter";
import { FileText, Download, Eye, Loader2, Sparkles, FileDown, FileType } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CoverLetterDialogProps {
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

export function CoverLetterDialog({ open, onOpenChange, job }: CoverLetterDialogProps) {
  const { generateCoverLetter, isGenerating, downloadAsTxt, downloadAsDoc, downloadAsPdf, isPremium } = useCoverLetter();
  const [content, setContent] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!job) return;
    const result = await generateCoverLetter({
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
      jobSkills: job.skills,
    });
    if (result) {
      setContent(result.content);
      setRemaining(result.remaining);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setContent(null);
      setShowPreview(false);
    }, 300);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="h-4.5 w-4.5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold truncate">
                Cover Letter — {job.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{job.company}</p>
            </div>
            {!isPremium && remaining !== null && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {remaining} left
              </Badge>
            )}
            {isPremium && (
              <Badge className="bg-accent/15 text-accent border-accent/20 text-[10px] shrink-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {!content ? (
              <motion.div
                key="generate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
                    <p className="text-sm font-medium text-foreground mb-1">Crafting your cover letter...</p>
                    <p className="text-xs text-muted-foreground">Analyzing job requirements and your profile</p>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                      <Sparkles className="h-7 w-7 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Generate a tailored cover letter</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                      AI will create a personalized cover letter based on this job's requirements and your resume profile.
                    </p>
                    <Button
                      onClick={handleGenerate}
                      className="rounded-full px-6 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Cover Letter
                    </Button>
                    {!isPremium && (
                      <p className="text-[11px] text-muted-foreground mt-3">
                        Free tier: 10 cover letters • Upgrade for unlimited
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            ) : showPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <ScrollArea className="h-[50vh] px-6 py-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                    {content.split("\n").map((line, i) => {
                      if (!line.trim()) return <br key={i} />;
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <p key={i} className="font-semibold text-foreground">{line.replace(/\*\*/g, "")}</p>;
                      }
                      return <p key={i} className="text-foreground/90 mb-2">{
                        line.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${t}</strong>`)
                      .split(/<\/?strong>/).map((part, pi) =>
                          pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part
                        )
                      }</p>;
                    })}
                  </div>
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 px-6 gap-4"
              >
                <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-foreground mb-1">Cover letter ready!</h3>
                  <p className="text-sm text-muted-foreground">Preview it or download in your preferred format.</p>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="rounded-full px-5"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="rounded-full px-5 bg-accent text-accent-foreground hover:bg-accent/90">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      <DropdownMenuItem onClick={() => downloadAsPdf(content, job.title, job.company)}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Download as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadAsDoc(content, job.title, job.company)}>
                        <FileType className="h-4 w-4 mr-2" />
                        Download as DOC
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadAsTxt(content, job.title, job.company)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Download as TXT
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  className="text-xs text-muted-foreground mt-1"
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Regenerate
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back from preview */}
        {showPreview && content && (
          <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="text-xs"
            >
              ← Back
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-full px-4 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => downloadAsPdf(content, job.title, job.company)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadAsDoc(content, job.title, job.company)}>
                  <FileType className="h-4 w-4 mr-2" />
                  Download as DOC
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadAsTxt(content, job.title, job.company)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download as TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
