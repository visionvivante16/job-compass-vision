import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSupportTickets, CreateTicketData } from "@/hooks/useSupportTickets";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, Send, Upload, X, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

const SUBJECT_OPTIONS = [
  { value: "account_issue", label: "Account issue" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "job_application_issue", label: "Job application issue" },
  { value: "report_employer", label: "Report employer" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG = {
  open: { label: "Open", variant: "destructive" as const, icon: AlertCircle },
  in_progress: { label: "In Progress", variant: "warning" as const, icon: Clock },
  closed: { label: "Closed", variant: "success" as const, icon: CheckCircle },
};

export default function Help() {
  const { user, isLoading: authLoading } = useAuth();
  const { tickets, isLoading, createTicket, isCreating } = useSupportTickets();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<CreateTicketData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-fill user data
  useState(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    createTicket(
      { ...formData, screenshot: screenshot || undefined },
      {
        onSuccess: () => {
          setFormData({ name: "", email: user.email || "", subject: "", message: "" });
          setScreenshot(null);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 5000);
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
    }
  };

  const userTickets = tickets?.filter(t => t.user_id === user.id) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Help & Support
        </h1>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submit Request Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submit a Request</CardTitle>
              <CardDescription>Need help? Send us a message and we'll get back to you.</CardDescription>
            </CardHeader>
            <CardContent>
              {showSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Request Submitted!</h3>
                  <p className="text-muted-foreground text-sm">
                    Your request has been sent. Our team will reply within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || user.email || ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData({ ...formData, subject: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Screenshot (optional)</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {screenshot ? (
                      <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
                        <span className="text-sm flex-1 truncate">{screenshot.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setScreenshot(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Attach Screenshot
                      </Button>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isCreating || !formData.subject}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Ticket
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* My Tickets Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Tickets</CardTitle>
              <CardDescription>Track your submitted support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : userTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No tickets yet</p>
                  <p className="text-sm">Submit a request if you need help.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {userTickets.map((ticket) => {
                    const status = STATUS_CONFIG[ticket.status];
                    const StatusIcon = status.icon;
                    return (
                      <div
                        key={ticket.id}
                        className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-medium text-foreground text-sm">
                            {SUBJECT_OPTIONS.find(s => s.value === ticket.subject)?.label || ticket.subject}
                          </span>
                          <Badge
                            variant={status.variant === "warning" ? "secondary" : status.variant}
                            className={status.variant === "warning" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" : status.variant === "success" ? "bg-green-500/20 text-green-600 border-green-500/30" : ""}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {ticket.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        {ticket.admin_reply && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs font-medium text-primary mb-1">Admin Reply:</p>
                            <p className="text-sm text-foreground">{ticket.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
