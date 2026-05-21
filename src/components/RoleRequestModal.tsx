import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";

interface RoleRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleRequestModal({ open, onOpenChange }: RoleRequestModalProps) {
  const { user } = useAuth();
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!role.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("role_requests" as any).insert({
        user_id: user.id,
        requested_role: role.trim(),
        location: location.trim() || null,
      });
      if (error) throw error;
      toast.success("✅ We'll have roles matching your request live within 24 hours!");
      setRole("");
      setLocation("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-accent" />
            Request a Role
          </DialogTitle>
          <DialogDescription>
            Tell us what role you're looking for and we'll source it for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              What role are you looking for? <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder='e.g. "AI Engineer", "Backend Dev - Go lang"'
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-secondary/50 border-border/60"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Preferred location or remote? <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <Input
              placeholder='e.g. "Remote", "New York", "San Francisco"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-secondary/50 border-border/60"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!role.trim() || submitting}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
