import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserPrice, buildCheckoutUrl } from "@/lib/pricing";

const SUCCESS_REDIRECT = `${window.location.origin}/payment-success`;

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const price = getUserPrice(user?.created_at);
  const stripeLink = buildCheckoutUrl({
    createdAt: user?.created_at,
    email: user?.email,
    userId: user?.id,
    successUrl: SUCCESS_REDIRECT,
  });

  const handleUpgrade = () => {
    setLoading(true);
    window.open(stripeLink, "_blank");
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-6 gap-0">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-bold text-foreground">Upgrade to apply unlimited</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            You've used your 5 free applications. Upgrade to continue applying.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 pt-4 pb-2 text-sm text-foreground">
          {[
            "Unlimited job applications",
            "Auto-tracking of applied jobs",
            "Priority access to new jobs",
            "AI-powered resume tailoring",
            "Cover letter generation",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-4">
          <Button
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Crown className="h-4 w-4 mr-1.5" />}
            Upgrade for {price}/month
          </Button>
          <Button
            variant="ghost"
            className="w-full rounded-xl text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
