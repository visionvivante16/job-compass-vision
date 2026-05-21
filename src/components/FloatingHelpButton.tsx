import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSupportTickets, CreateTicketData } from "@/hooks/useSupportTickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle, Send, Upload, X, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUBJECT_OPTIONS = [
  { value: "account_issue", label: "Account issue" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "job_application_issue", label: "Job application issue" },
  { value: "report_employer", label: "Report employer" },
  { value: "other", label: "Other" },
];

interface FloatingHelpButtonProps {
  variant?: "floating" | "inline";
}

export function FloatingHelpButton({ variant = "floating" }: FloatingHelpButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createTicket, isCreating } = useSupportTickets();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<CreateTicketData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);


  const handleClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setFormData(prev => ({ ...prev, email: user.email || "" }));
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    createTicket(
      { ...formData, screenshot: screenshot || undefined },
      {
        onSuccess: () => {
          setFormData({ name: "", email: user?.email || "", subject: "", message: "" });
          setScreenshot(null);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setOpen(false);
          }, 3000);
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

  return (
    <>
      {variant === "floating" ? (
        <Button
          onClick={handleClick}
          className="fixed bottom-6 right-[104px] h-14 px-5 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50"
          size="lg"
        >
          <HelpCircle className="h-5 w-5 mr-2" />
          Need Help?
        </Button>
      ) : (
        <Button
          onClick={handleClick}
          variant="outline"
          size="sm"
          className="rounded-full px-4 h-9 gap-1.5 border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Need Help?
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Need Help?</DialogTitle>
            <DialogDescription>
              Send us a message and we'll get back to you within 24 hours.
            </DialogDescription>
          </DialogHeader>

          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Request Submitted!</h3>
              <p className="text-muted-foreground text-sm">
                Our team will reply within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="popup-name">Your Name</Label>
                  <Input
                    id="popup-name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="popup-email">Email</Label>
                  <Input
                    id="popup-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="popup-subject">Subject</Label>
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
                <Label htmlFor="popup-message">Message</Label>
                <Textarea
                  id="popup-message"
                  placeholder="Describe your issue..."
                  rows={3}
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
                  <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-border">
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
                    size="sm"
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
                    Submit
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
