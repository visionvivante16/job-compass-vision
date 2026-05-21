import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreditCard, Crown, Loader2, Calendar, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getUserPrice } from "@/lib/pricing";

export function SubscriptionBillingCard() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["my-subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // While profile is loading, treat as premium to avoid false upgrade prompts
  const isPremium = profileLoading ? true : (profile?.is_premium ?? false);
  const isSubscribed = subscription?.is_subscribed ?? false;
  const nextRenewal = subscription?.next_renewal_date;
  // Detect cancel-at-period-end: premium + subscribed but renewal is in the past or we check via cancel flag
  // We'll track cancelled state locally after user cancels
  const [pendingCancel, setPendingCancel] = useState(false);
  const [cancelEndDate, setCancelEndDate] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { action: "cancel" },
      });
      if (error) {
        console.error("[Cancel] invoke error:", error);
        throw new Error(error.message || "Failed to cancel subscription");
      }
      if (!data?.ok) {
        console.error("[Cancel] backend error:", data);
        throw new Error(data?.error || "Failed to cancel subscription");
      }

      setPendingCancel(true);
      setCancelEndDate(data.subscription_end);
      toast({ title: "Subscription cancelled", description: "You'll retain access until the end of your billing period." });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { action: "resume" },
      });
      if (error) {
        console.error("[Resume] invoke error:", error);
        throw new Error(error.message || "Failed to resume subscription");
      }
      if (!data?.ok) {
        console.error("[Resume] backend error:", data);
        throw new Error(data?.error || "Failed to resume subscription");
      }

      setPendingCancel(false);
      setCancelEndDate(null);
      toast({ title: "Subscription resumed!", description: "Your premium access will continue." });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (err: any) {
      toast({ title: "Failed to resume", description: err.message, variant: "destructive" });
    } finally {
      setIsResuming(false);
    }
  };

  if (!user) return null;

  const planName = isPremium ? "Premium" : "Free";
  const planStatus = pendingCancel ? "Cancelling" : isPremium ? "Active" : "Free";
  const effectiveEndDate = cancelEndDate || nextRenewal;

  return (
    <>
      <Card className="rounded-3xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Subscription & Billing</CardTitle>
          </div>
          <CardDescription>Manage your plan and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Plan overview */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Current Plan</span>
                    <Badge
                      variant={isPremium ? "default" : "outline"}
                      className={isPremium ? "bg-accent text-accent-foreground" : ""}
                    >
                      {planName}
                    </Badge>
                    {pendingCancel && (
                      <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-[10px]">
                        Cancelling
                      </Badge>
                    )}
                  </div>
                  {isPremium && (
                    <p className="text-xs text-muted-foreground">
                      Premium • Unlimited applications
                    </p>
                  )}
                  {!isPremium && (
                    <p className="text-xs text-muted-foreground">
                      5 free applications • Limited features
                    </p>
                  )}
                </div>
                {isPremium && (
                  <Crown className="h-6 w-6 text-accent" />
                )}
              </div>

              {/* Billing date */}
              {isPremium && effectiveEndDate && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {pendingCancel ? "Access until" : "Next billing date"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(effectiveEndDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}

              {/* Pending cancellation warning */}
              {pendingCancel && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      Your subscription is set to cancel
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You'll keep Premium access until {effectiveEndDate ? format(new Date(effectiveEndDate), "MMM d, yyyy") : "the end of your billing period"}. After that, you'll be downgraded to the Free plan.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {!isPremium && (
                  <Button
                    onClick={() => setShowUpgrade(true)}
                    className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Upgrade to Premium — {getUserPrice(user?.created_at)}/mo
                  </Button>
                )}

                {isPremium && !pendingCancel && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full rounded-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    Cancel Subscription
                  </Button>
                )}

                {pendingCancel && (
                  <Button
                    onClick={handleResume}
                    disabled={isResuming}
                    className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {isResuming ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                    Resume Subscription
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your Premium subscription? You'll keep access until the end of your current billing period, then be downgraded to the Free plan with 5 application limit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
