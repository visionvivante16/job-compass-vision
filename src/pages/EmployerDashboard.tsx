import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/usePermissions";
import { useAdminJobs, useUpdateJob, useDeleteJob, useDuplicateJob } from "@/hooks/useAdminJobs";
import { JobForm } from "@/components/admin/JobForm";
import { CSVBulkUpload } from "@/components/admin/CSVBulkUpload";
import { AdminJobsList } from "@/components/admin/AdminJobsList";
import { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Plus, FileSpreadsheet } from "lucide-react";
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

export default function EmployerDashboard() {
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const { data: jobs = [], isLoading: jobsLoading } = useAdminJobs();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const duplicateJob = useDuplicateJob();

  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const isFounder = userRole === "founder";
  const isEmployer = userRole === "employer";

  // Memoize filtered jobs to prevent re-renders
  const myJobs = useMemo(() => {
    if (!user?.id) return [];
    // Founders see all; employers see only own
    if (isFounder) return jobs;
    return jobs.filter((job) => job.created_by_user_id === user.id);
  }, [jobs, user?.id, isFounder]);

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setShowForm(true);
    setShowBulkUpload(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingJob(null);
  };

  const handleTogglePublished = async (job: Job) => {
    await updateJob.mutateAsync({
      id: job.id,
      data: { is_published: !job.is_published },
    });
  };

  const handleToggleReviewing = async (job: Job) => {
    await updateJob.mutateAsync({
      id: job.id,
      data: { is_reviewing: !job.is_reviewing },
    });
  };

  const handleDelete = async () => {
    if (deletingJobId) {
      await deleteJob.mutateAsync(deletingJobId);
      setDeletingJobId(null);
    }
  };

  const handleDuplicate = async (job: Job) => {
    await duplicateJob.mutateAsync(job);
  };

  // Block access if not employer or founder
  if (roleLoading || jobsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Only employer or founder may access
  if (!isEmployer && !isFounder) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Employer Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your job listings
              </p>
            </div>
          </div>

          {!showForm && !showBulkUpload && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowBulkUpload(true); setShowForm(false); }}>
                <FileSpreadsheet className="h-4 w-4" />
                CSV Upload
              </Button>
              <Button variant="accent" onClick={() => { setShowForm(true); setShowBulkUpload(false); }}>
                <Plus className="h-4 w-4" />
                Add Job
              </Button>
            </div>
          )}
        </div>

        {/* Bulk Upload Section */}
        {showBulkUpload && (
          <div className="mb-8 animate-fade-in">
            <CSVBulkUpload onComplete={() => setShowBulkUpload(false)} />
            <div className="mt-4 flex justify-end">
              <button
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowBulkUpload(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Job Form */}
        {showForm && (
          <div className="mb-8 animate-fade-in">
            <JobForm job={editingJob} onClose={handleCloseForm} />
          </div>
        )}

        {/* Jobs List - Only employer's own jobs (founder sees all) */}
        <AdminJobsList
          jobs={myJobs}
          isLoading={jobsLoading}
          isFounder={isFounder}
          canEditJobs={true}
          canDeleteJobs={true}
          canPostJobs={true}
          onEdit={handleEdit}
          onDelete={setDeletingJobId}
          onDuplicate={handleDuplicate}
          onTogglePublished={handleTogglePublished}
          onToggleReviewing={handleToggleReviewing}
          onAddJob={() => setShowForm(true)}
          onBulkUpload={() => setShowBulkUpload(true)}
          duplicateIsPending={duplicateJob.isPending}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingJobId} onOpenChange={() => setDeletingJobId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Job</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this job? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
