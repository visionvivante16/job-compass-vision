import { useState } from "react";
import { useSupportTickets, SupportTicket } from "@/hooks/useSupportTickets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TicketIcon, Clock, CheckCircle, AlertCircle, Send, X, Loader2, Image } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const SUBJECT_OPTIONS = [
  { value: "account_issue", label: "Account issue" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "job_application_issue", label: "Job application issue" },
  { value: "report_employer", label: "Report employer" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-red-500/20 text-red-600 border-red-500/30", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30", icon: Clock },
  closed: { label: "Closed", color: "bg-green-500/20 text-green-600 border-green-500/30", icon: CheckCircle },
};

export function SupportTicketsPanel() {
  const { tickets, isLoading, replyToTicket, closeTicket, isUpdating } = useSupportTickets();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const filteredTickets = tickets?.filter(
    (ticket) => statusFilter === "all" || ticket.status === statusFilter
  ) || [];

  const handleOpenTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.admin_reply || "");
    
    // Load screenshot if exists
    if (ticket.screenshot_url) {
      const { data } = await supabase.storage
        .from("support-screenshots")
        .createSignedUrl(ticket.screenshot_url, 3600);
      setScreenshotUrl(data?.signedUrl || null);
    } else {
      setScreenshotUrl(null);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    await replyToTicket(selectedTicket.id, replyText);
    setSelectedTicket(null);
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    await closeTicket(selectedTicket.id);
    setSelectedTicket(null);
  };

  const openCount = tickets?.filter(t => t.status === "open").length || 0;
  const inProgressCount = tickets?.filter(t => t.status === "in_progress").length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Support Tickets</CardTitle>
            {openCount > 0 && (
              <Badge variant="destructive" className="ml-2">{openCount} open</Badge>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tickets</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription>
          {openCount} open, {inProgressCount} in progress, {(tickets?.length || 0) - openCount - inProgressCount} closed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TicketIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredTickets.map((ticket) => {
              const status = STATUS_CONFIG[ticket.status];
              const StatusIcon = status.icon;
              return (
                <div
                  key={ticket.id}
                  onClick={() => handleOpenTicket(ticket)}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-medium text-foreground">
                        {SUBJECT_OPTIONS.find(s => s.value === ticket.subject)?.label || ticket.subject}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {ticket.name} • {ticket.email}
                      </p>
                    </div>
                    <Badge className={status.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {ticket.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {ticket.screenshot_url && (
                      <Badge variant="outline" className="text-xs">
                        <Image className="h-3 w-3 mr-1" />
                        Has screenshot
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTicket && (SUBJECT_OPTIONS.find(s => s.value === selectedTicket.subject)?.label || selectedTicket.subject)}
            </DialogTitle>
            <DialogDescription>
              From {selectedTicket?.name} ({selectedTicket?.email})
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_CONFIG[selectedTicket.status].color}>
                  {STATUS_CONFIG[selectedTicket.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(selectedTicket.created_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {screenshotUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attached Screenshot:</p>
                  <img
                    src={screenshotUrl}
                    alt="Support screenshot"
                    className="max-w-full rounded-lg border border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Admin Reply:</p>
                <Textarea
                  placeholder="Type your reply..."
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>

              {selectedTicket.replied_at && (
                <p className="text-xs text-muted-foreground">
                  Last replied: {format(new Date(selectedTicket.replied_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleReply}
                  disabled={isUpdating || !replyText.trim()}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
                {selectedTicket.status !== "closed" && (
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close Ticket
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
