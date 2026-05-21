import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Sparkles, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export function NotificationOptInDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [matchedJobs, setMatchedJobs] = useState(true);
  const [sponsorshipJobs, setSponsorshipJobs] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const seenKey = `notif_opt_in_seen_${user.id}`;

    // Already seen — never show again
    if (localStorage.getItem(seenKey)) return;

    const checkFirstTime = async () => {
      // Only show if user has a profile (i.e. profile was created)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Show only if profile exists AND popup hasn't been seen
      if (profile) {
        setOpen(true);
      }
    };

    // Small delay to let the country dialog finish first
    const timer = setTimeout(checkFirstTime, 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleSave = async (subscribe: boolean) => {
    if (!user) return;
    setSaving(true);

    try {
      const prefs = {
        daily_digest_enabled: subscribe ? dailyDigest : false,
        matched_jobs_enabled: subscribe ? matchedJobs : false,
        sponsorship_jobs_enabled: subscribe ? sponsorshipJobs : false,
        new_jobs_enabled: subscribe,
        unsubscribed_at: subscribe ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("email_notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("email_notification_preferences")
          .update(prefs)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("email_notification_preferences")
          .insert({ user_id: user.id, ...prefs });
      }

      localStorage.setItem(`notif_opt_in_seen_${user.id}`, "true");
      setOpen(false);
      toast.success(subscribe ? "You're subscribed to job notifications! 🎉" : "No worries, you can enable notifications anytime from your profile.");
    } catch (err: any) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && user) {
        // Mark as seen whenever dialog closes (X, outside click, or save)
        localStorage.setItem(`notif_opt_in_seen_${user.id}`, "true");
      }
      setOpen(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Stay in the loop! 🚀</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Get daily job alerts delivered to your inbox — new listings, skill-matched roles, and visa sponsorship opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Daily Job Digest</span>
            </div>
            <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Jobs Matching My Skills</span>
            </div>
            <Switch checked={matchedJobs} onCheckedChange={setMatchedJobs} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Visa Sponsorship Alerts</span>
            </div>
            <Switch checked={sponsorshipJobs} onCheckedChange={setSponsorshipJobs} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="text-muted-foreground"
          >
            Maybe later
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
            <Bell className="h-4 w-4" />
            Subscribe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
