import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Job } from "@/types/job";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";
import { Copy, Check, ExternalLink, Linkedin, Sparkles, RefreshCw, Crown } from "lucide-react";

const FREE_DAILY_LIMIT = 3;

interface LinkedInConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}

export function LinkedInConnectDialog({ open, onOpenChange, job }: LinkedInConnectDialogProps) {
  const { profile, isLoading: profileLoading } = useProfile();
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [remaining, setRemaining] = useState<number>(FREE_DAILY_LIMIT);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const isPremium = profileLoading ? true : (profile?.is_premium ?? false);
  const isLimitReached = !isPremium && remaining <= 0;

  const linkedInSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}&origin=GLOBAL_SEARCH_HEADER`;

  // Fetch current usage from DB when dialog opens
  useEffect(() => {
    if (!open || isPremium) return;
    const fetchUsage = async () => {
      setLoadingUsage(true);
      try {
        const { data } = await supabase
          .from("linkedin_message_usage")
          .select("usage_count")
          .eq("usage_date", new Date().toISOString().slice(0, 10))
          .maybeSingle();
        const used = data?.usage_count ?? 0;
        setRemaining(Math.max(0, FREE_DAILY_LIMIT - used));
      } catch {
        // fallback — allow usage
      } finally {
        setLoadingUsage(false);
      }
    };
    fetchUsage();
  }, [open, isPremium]);

  const generateMessage = async () => {
    if (isLimitReached) return;
    setIsGenerating(true);
    try {
      const intelligence = profile?.resume_intelligence as Record<string, any> | null;
      const education = profile?.education as any[] | null;
      const workExp = profile?.work_experience as any[] | null;

      const { data, error } = await supabase.functions.invoke("generate-linkedin-message", {
        body: {
          job_title: job.title,
          company: job.company,
          job_skills: job.skills || [],
          job_description: job.description?.slice(0, 500) || undefined,
          user_name: profile?.full_name || profile?.first_name || undefined,
          user_title: profile?.current_title || undefined,
          user_skills: profile?.skills || [],
          user_experience_years: profile?.experience_years || undefined,
          user_education: education || undefined,
          user_work_experience: workExp || undefined,
          user_resume_intelligence: intelligence || undefined,
        },
      });

      if (error) throw error;

      // Handle limit reached from server
      if (data?.limit_reached) {
        setRemaining(0);
        toast.error("Daily limit reached. Upgrade to Premium for unlimited messages.");
        return;
      }

      if (data?.error) throw new Error(data.error);

      setMessage(data.message);
      setHasGenerated(true);

      // Update remaining from server response
      if (typeof data.remaining === "number") {
        setRemaining(data.remaining);
      }
    } catch (err: any) {
      console.error("Failed to generate message:", err);
      toast.error(friendlyError(err, "We couldn't generate your message. Please try again."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setMessage("");
      setHasGenerated(false);
      setCopied(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            Connect at {job.company}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Usage indicator */}
          {!isPremium && (
            <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
              remaining === 0
                ? "bg-destructive/10 text-destructive"
                : remaining === 1
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  : "bg-muted text-muted-foreground"
            }`}>
              <span>
                {loadingUsage
                  ? "Checking usage..."
                  : remaining === 0
                    ? "Daily limit reached"
                    : `${remaining} of ${FREE_DAILY_LIMIT} free message${remaining === 1 ? "" : "s"} left today`}
              </span>
              {remaining <= 1 && !loadingUsage && (
                <button
                  onClick={() => window.open("/profile", "_self")}
                  className="flex items-center gap-1 font-semibold text-accent hover:underline"
                >
                  <Crown className="h-3 w-3" />
                  Upgrade
                </button>
              )}
            </div>
          )}

          {isPremium && (
            <div className="flex items-center gap-1.5 text-xs text-accent px-3 py-2 rounded-lg bg-accent/10">
              <Crown className="h-3 w-3" />
              <span className="font-medium">Premium — Unlimited messages</span>
            </div>
          )}

          {/* Generate Message */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Generate a personalized connection request message for people at <strong>{job.company}</strong> regarding the <strong>{job.title}</strong> role.
            </p>

            {isLimitReached && !hasGenerated ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  You've used all {FREE_DAILY_LIMIT} free messages for today.
                </p>
                <p className="text-xs text-muted-foreground">
                  Upgrade to Premium for unlimited AI-generated connection messages.
                </p>
                <Button
                  onClick={() => window.open("/profile", "_self")}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </div>
            ) : !hasGenerated ? (
              <Button
                onClick={generateMessage}
                disabled={isGenerating || loadingUsage}
                className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white"
              >
                {isGenerating ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate Connection Message</>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                  placeholder="Your connection message..."
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{message.length}/300 characters</span>
                  {message.length > 300 && (
                    <span className="text-destructive font-medium">Over LinkedIn's limit!</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-1"
                  >
                    {copied ? (
                      <><Check className="h-4 w-4 mr-1.5 text-green-500" />Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-1.5" />Copy Message</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateMessage}
                    disabled={isGenerating || isLimitReached}
                    className="shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Find People */}
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-sm font-medium">Find people at {job.company}</p>
            <p className="text-xs text-muted-foreground">
              Search LinkedIn for employees at this company, then send your connection request with the message above.
            </p>
            <Button
              variant="outline"
              className="w-full border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10"
              onClick={() => window.open(linkedInSearchUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Search on LinkedIn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
