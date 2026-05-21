import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";

interface PostApplyConfirmDialogProps {
  open: boolean;
  onYes: () => void;
  onNo: () => void;
  jobTitle?: string;
  company?: string;
}

export function PostApplyConfirmDialog({
  open,
  onYes,
  onNo,
  jobTitle,
  company,
}: PostApplyConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onNo()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            Did you complete your application?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-muted-foreground">
              <p>
                You opened the application page for{" "}
                <span className="font-semibold text-foreground">{jobTitle}</span>{" "}
                at{" "}
                <span className="font-semibold text-foreground">{company}</span>.
              </p>
              <p className="text-sm">
                If you completed the application, we'll track it in your Applied list.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:gap-3">
          <Button variant="outline" onClick={onNo} className="gap-2">
            <X className="h-4 w-4" />
            Not yet
          </Button>
          <Button
            onClick={onYes}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <CheckCircle2 className="h-4 w-4" />
            Yes, I applied
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
