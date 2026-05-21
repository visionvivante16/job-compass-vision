import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

interface ApplyConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  jobTitle?: string;
  company?: string;
  applicationsUsed?: number;
  applicationLimit?: number;
  isPremium?: boolean;
}

export function ApplyConfirmDialog({
  open,
  onConfirm,
  onCancel,
  jobTitle,
  company,
  applicationsUsed = 0,
  applicationLimit = 5,
  isPremium = false,
}: ApplyConfirmDialogProps) {
  const remaining = Math.max(applicationLimit - applicationsUsed, 0);

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            Ready to apply?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-muted-foreground">
              <p>
                You're about to apply for{" "}
                <span className="font-semibold text-foreground">{jobTitle}</span>{" "}
                at{" "}
                <span className="font-semibold text-foreground">{company}</span>.
              </p>
              {!isPremium && (
                <p className="text-sm">
                  This will use{" "}
                  <span className="font-semibold text-foreground">
                    1 of your {applicationLimit} free applications
                  </span>{" "}
                  ({remaining} remaining).
                </p>
              )}
              <p className="text-sm">
                We'll open the application page in a new tab once you confirm.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:gap-3">
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Proceed & Apply
            <ArrowRight className="h-4 w-4" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
