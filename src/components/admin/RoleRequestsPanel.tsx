import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, MessageSquarePlus, Send, ChevronLeft, ChevronRight, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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

const PAGE_SIZE = 10;
const BULK_CONCURRENCY = 2;

type BulkMode = "ack-all" | "resend-all" | null;

export function RoleRequestsPanel() {
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [confirmReq, setConfirmReq] = useState<any | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [page, setPage] = useState(1);
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["role-requests-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_requests" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const userIds = [...new Set(requests.map((r: any) => r.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["role-request-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, first_name, is_premium")
        .in("user_id", userIds);
      return data || [];
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pagedRequests = useMemo(
    () => requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [requests, page]
  );

  const unackedCount = useMemo(
    () => requests.filter((r: any) => !r.acknowledged_at).length,
    [requests]
  );
  const ackedCount = requests.length - unackedCount;

  // Send a single ack (used by both individual and bulk flows). Returns true on success.
  const sendOne = async (req: any, message?: string): Promise<boolean> => {
    const profile = profileMap.get(req.user_id);
    if (!profile?.email) return false;

    try {
      const { error } = await supabase.functions.invoke("role-request-ack", {
        body: {
          requestId: req.id,
          recipientEmail: profile.email,
          recipientName: profile.first_name || profile.full_name || null,
          requestedRole: req.requested_role,
          location: req.location || null,
          customMessage: message?.trim() || undefined,
          isPremium: !!profile.is_premium,
        },
      });
      if (error) throw error;

      await supabase
        .from("role_requests" as any)
        .update({ acknowledged_at: new Date().toISOString() } as any)
        .eq("id", req.id);

      req.acknowledged_at = new Date().toISOString();
      return true;
    } catch {
      return false;
    }
  };

  const handleSendAck = async (req: any) => {
    setSendingIds((prev) => new Set(prev).add(req.id));
    setConfirmReq(null);
    const msg = customMessage;
    setCustomMessage("");

    const profile = profileMap.get(req.user_id);
    if (!profile?.email) {
      toast.error("No email found for this user");
      setSendingIds((prev) => { const n = new Set(prev); n.delete(req.id); return n; });
      return;
    }

    const ok = await sendOne(req, msg);
    if (ok) toast.success(`Acknowledgment sent to ${profile.email}`);
    else toast.error("Failed to send email");

    setSendingIds((prev) => { const n = new Set(prev); n.delete(req.id); return n; });
  };

  const runBulk = async () => {
    if (!bulkMode) return;
    const targets =
      bulkMode === "ack-all"
        ? requests.filter((r: any) => !r.acknowledged_at)
        : requests.filter((r: any) => !!r.acknowledged_at);

    const valid = targets.filter((r: any) => profileMap.get(r.user_id)?.email);
    const skipped = targets.length - valid.length;

    if (valid.length === 0) {
      toast.info("No eligible recipients");
      setBulkMode(null);
      setCustomMessage("");
      return;
    }

    setBulkRunning(true);
    setBulkProgress({ done: 0, total: valid.length });
    setSendingIds(new Set(valid.map((r: any) => r.id)));

    const msg = customMessage;
    let success = 0;
    let failed = 0;

    // Process with limited concurrency
    let cursor = 0;
    const workers = Array.from({ length: Math.min(BULK_CONCURRENCY, valid.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= valid.length) break;
        const req = valid[i];
        const ok = await sendOne(req, msg);
        if (ok) success++; else failed++;
        setBulkProgress({ done: success + failed, total: valid.length });
        setSendingIds((prev) => { const n = new Set(prev); n.delete(req.id); return n; });
      }
    });
    await Promise.all(workers);

    setBulkRunning(false);
    setBulkMode(null);
    setCustomMessage("");
    setSendingIds(new Set());

    const parts = [`${success} sent`];
    if (failed) parts.push(`${failed} failed`);
    if (skipped) parts.push(`${skipped} skipped (no email)`);
    if (failed) toast.error(parts.join(" • "));
    else toast.success(parts.join(" • "));

    refetch();
  };

  const confirmProfile = confirmReq ? profileMap.get(confirmReq.user_id) : null;

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <MessageSquarePlus className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Role Requests</h2>
          <span className="text-xs text-muted-foreground">{requests.length} total</span>

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading || bulkRunning || unackedCount === 0}
              onClick={() => { setBulkMode("ack-all"); setCustomMessage(""); }}
              className="h-8 text-xs rounded-full"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Acknowledge all ({unackedCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading || bulkRunning || ackedCount === 0}
              onClick={() => { setBulkMode("resend-all"); setCustomMessage(""); }}
              className="h-8 text-xs rounded-full"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Resend all ({ackedCount})
            </Button>
          </div>
        </div>

        {bulkRunning && (
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Sending {bulkProgress.done} / {bulkProgress.total}…
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No role requests yet.</p>
        ) : (
          <>
            <div className="space-y-3">
              {pagedRequests.map((req: any) => {
                const profile = profileMap.get(req.user_id);
                const isSending = sendingIds.has(req.id);
                const isSent = !!req.acknowledged_at;

                return (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {req.requested_role}
                      </p>
                      {req.location && (
                        <p className="text-xs text-muted-foreground mt-0.5">📍 {req.location}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {profile?.email || "Unknown user"} • {format(new Date(req.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isSent ? "outline" : "default"}
                      disabled={isSending || bulkRunning}
                      onClick={() => { setConfirmReq(req); const p = profileMap.get(req.user_id); setCustomMessage(p?.is_premium ? "" : "Please upgrade to Premium — slots are filling up fast! 🚀"); }}
                      className="shrink-0 text-xs h-8 rounded-full"
                    >
                      {isSending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      {isSent ? "Resend" : "Acknowledge"}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-7 px-2 text-xs rounded-full"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 px-2 text-xs rounded-full"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Single send confirmation */}
      <AlertDialog open={!!confirmReq} onOpenChange={(open) => { if (!open) { setConfirmReq(null); setCustomMessage(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Acknowledgment Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a confirmation email to{" "}
              <span className="font-semibold text-foreground">{confirmProfile?.email || "the user"}</span> acknowledging their request for{" "}
              <span className="font-semibold text-foreground">"{confirmReq?.requested_role}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Custom message (optional)</label>
            <Textarea
              placeholder="e.g. We've manually removed your subscription from Stripe. You're now on the free plan."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmReq && handleSendAck(confirmReq)}>
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk confirmation */}
      <AlertDialog open={!!bulkMode} onOpenChange={(open) => { if (!open) { setBulkMode(null); setCustomMessage(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkMode === "ack-all" ? "Acknowledge all pending requests?" : "Resend to all acknowledged requests?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkMode === "ack-all"
                ? `This will send acknowledgment emails to ${unackedCount} user${unackedCount === 1 ? "" : "s"} who haven't been notified yet.`
                : `This will resend the acknowledgment email to ${ackedCount} user${ackedCount === 1 ? "" : "s"} who were already notified.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Custom message (optional, applied to all)</label>
            <Textarea
              placeholder="Add an optional note to include in every email…"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runBulk}>
              {bulkMode === "ack-all" ? `Send ${unackedCount} email${unackedCount === 1 ? "" : "s"}` : `Resend ${ackedCount} email${ackedCount === 1 ? "" : "s"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
