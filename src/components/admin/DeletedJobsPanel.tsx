import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useDeletedJobs, useRestoreJob, usePermanentDeleteJob } from "@/hooks/useAdminJobs";
import { Loader2, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

export function DeletedJobsPanel() {
  const { data: deletedJobs = [], isLoading } = useDeletedJobs();
  const restoreJob = useRestoreJob();
  const permanentDelete = usePermanentDeleteJob();
  const [expanded, setExpanded] = useState(false);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="text-center py-6">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Trash ({deletedJobs.length} jobs)
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <>
          {deletedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-6">No deleted jobs.</p>
          ) : (
            <div className="space-y-3">
              {deletedJobs.map((job) => (
                <Card key={job.id} className="p-4 border-border/40 opacity-75">
                  <div className="flex items-center gap-3">
                    <CompanyLogo logoUrl={job.company_logo} companyName={job.company} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.company} • Deleted {job.deleted_at ? formatDistanceToNow(new Date(job.deleted_at), { addSuffix: true }) : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreJob.mutate(job.id)}
                        disabled={restoreJob.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setPermanentDeleteId(job.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!permanentDeleteId} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the job. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (permanentDeleteId) {
                  permanentDelete.mutate(permanentDeleteId);
                  setPermanentDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
