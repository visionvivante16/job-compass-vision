import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserCircle, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: string[];
}

export function ProfileGateDialog({ open, onOpenChange, missingFields }: ProfileGateDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-accent" />
            </div>
            <DialogTitle className="text-lg">Complete Your Profile</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Complete your profile to start applying for jobs. This helps employers learn about you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Missing fields</p>
          <ul className="space-y-1.5">
            {missingFields.map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm text-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                {field}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Later
          </Button>
          <Button
            className="flex-1 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => {
              onOpenChange(false);
              navigate("/profile");
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Go to Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
