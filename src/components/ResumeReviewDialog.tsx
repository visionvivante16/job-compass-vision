import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ArrowRight } from "lucide-react";

interface FieldChange {
  label: string;
  field: string;
  oldValue: string;
  newValue: string;
}

interface ResumeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: FieldChange[];
  onApply: () => void;
}

export function ResumeReviewDialog({ open, onOpenChange, changes, onApply }: ResumeReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Review Extracted Data</DialogTitle>
          <DialogDescription>
            The following fields were found in your resume. Review the changes before applying.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3">
            {changes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No new data was extracted from your resume.</p>
            ) : (
              changes.map((change, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{change.label}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {change.oldValue ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through truncate max-w-[200px]">{change.oldValue}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </>
                      ) : null}
                      <span className="text-xs text-foreground font-medium truncate max-w-[250px]">{change.newValue}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {change.oldValue ? "Update" : "New"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onApply} disabled={changes.length === 0}>
            <Check className="h-4 w-4 mr-1" />
            Apply {changes.length} Update{changes.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
