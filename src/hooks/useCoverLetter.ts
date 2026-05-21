import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { scheduleFeedbackPrompt } from "@/hooks/useFeedbackPrompt";
import { friendlyError } from "@/lib/friendlyError";

interface GenerateParams {
  jobId: string;
  jobTitle: string;
  company: string;
  jobDescription?: string;
  jobSkills?: string[];
}

interface CoverLetterResult {
  content: string;
  id?: string;
  remaining: number | null;
  isPremium: boolean;
}

// Module-level session cache so reopening the cover-letter dialog for the
// same job within one session does not re-trigger an AI call.
const coverLetterCache = new Map<string, CoverLetterResult>();

export function useCoverLetter() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  const generateCoverLetter = async (params: GenerateParams): Promise<CoverLetterResult | null> => {
    if (!user) {
      toast({ title: "Please sign in", variant: "destructive" });
      return null;
    }

    const cacheKey = `${user.id}|${params.jobId}`;
    const cached = coverLetterCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: params,
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error === "limit_reached") {
          toast({
            title: "Cover letter limit reached",
            description: data.message,
            variant: "destructive",
          });
          return null;
        }
        throw new Error(data.error);
      }

      const result = data as CoverLetterResult;
      coverLetterCache.set(cacheKey, result);

      toast({
        title: "Cover letter generated ✨",
        description: `Draft ready for ${params.company}`,
      });

      // Schedule feedback prompt 5s after generation
      scheduleFeedbackPrompt("cover_letter", 5000);

      return result;
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: friendlyError(err, "We couldn't generate your cover letter. Please try again."),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsTxt = (content: string, jobTitle: string, company: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cover_Letter_${company}_${jobTitle}.txt`.replace(/[^a-zA-Z0-9_.-]/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formatContent = (raw: string) =>
    escapeHtml(raw)
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");

  const downloadAsDoc = (content: string, jobTitle: string, company: string) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Cover Letter</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.6;max-width:700px;margin:40px auto;color:#222;}h1,h2,h3{color:#111;}p{margin-bottom:12px;}</style>
</head>
<body>
${formatContent(content)}
</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cover_Letter_${company}_${jobTitle}.doc`.replace(/[^a-zA-Z0-9_.-]/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsPdf = async (content: string, jobTitle: string, company: string) => {
    // Use browser print to generate PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Please allow popups to download PDF", variant: "destructive" });
      return;
    }
    const safeCompany = escapeHtml(company);
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title> </title>
<style>
@page { margin: 1in; size: auto; }
@media print {
  @page { margin: 1in; }
  html, body { -webkit-print-color-adjust: exact; }
}
body{font-family:'Georgia',serif;font-size:11pt;line-height:1.7;max-width:650px;margin:0 auto;padding:40px;color:#1a1a1a;}
p{margin-bottom:14px;}
strong{font-weight:600;}
</style>
</head>
<body>
${formatContent(content)}
<script>
  // Clear title so browsers don't print "Cover Letter - Company" as header
  document.title = '';
  window.onload=function(){setTimeout(function(){window.print();},100);window.onafterprint=function(){window.close();}}
</script>
</body></html>`;
    // Note: The "about:blank" footer and date header are browser-injected defaults
    // when printing. Users must disable "Headers and footers" in the print dialog's
    // "More settings" to fully remove them — browsers do not allow CSS to hide these.
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return {
    generateCoverLetter,
    isGenerating,
    downloadAsTxt,
    downloadAsDoc,
    downloadAsPdf,
    isPremium: profile?.is_premium === true,
  };
}
