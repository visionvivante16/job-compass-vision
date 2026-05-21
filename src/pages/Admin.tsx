import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useMyPermissions } from "@/hooks/usePermissions";
import { useAdminJobs, useUpdateJob, useDeleteJob, useDuplicateJob } from "@/hooks/useAdminJobs";
import { JobForm } from "@/components/admin/JobForm";
import { CSVBulkUpload } from "@/components/admin/CSVBulkUpload";
import { SupportTicketsPanel } from "@/components/admin/SupportTicketsPanel";
import { DeletedJobsPanel } from "@/components/admin/DeletedJobsPanel";
import { RoleRequestsPanel } from "@/components/admin/RoleRequestsPanel";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminJobsList } from "@/components/admin/AdminJobsList";
import { Job } from "@/types/job";
import { Loader2 } from "lucide-react";
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

export default function Admin() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { data: permissions, isLoading: permLoading } = useMyPermissions();
  const { data: jobs = [], isLoading: jobsLoading } = useAdminJobs();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const duplicateJob = useDuplicateJob();

  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const isLoading = authLoading || permLoading;
  const isFounder = permissions?.isFounder ?? false;
  const isEmployer = permissions?.isEmployer ?? false;
  const canPostJobs = permissions?.can_post_jobs ?? false;
  const canEditJobs = permissions?.can_edit_jobs ?? false;
  const canDeleteJobs = permissions?.can_delete_jobs ?? false;
  const canViewGraphs = permissions?.can_view_graphs ?? false;
  const canImportGoogleSheet = permissions?.can_import_google_sheet ?? false;

  // User must be admin (founder or have any employer permission) to access
  const hasAccess = isFounder || isEmployer;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

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

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <AdminHeader
          isFounder={isFounder}
          showForm={showForm}
          showBulkUpload={showBulkUpload}
          canPostJobs={canPostJobs}
          canImportGoogleSheet={canImportGoogleSheet}
          onAddJob={() => { setShowForm(true); setShowBulkUpload(false); }}
          onBulkUpload={() => { setShowBulkUpload(true); setShowForm(false); }}
        />

        {/* Bulk Upload Section */}
        {showBulkUpload && (isFounder || canPostJobs) && (
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
        {showForm && (isFounder || canPostJobs || (editingJob && canEditJobs)) && (
          <div className="mb-8 animate-fade-in">
            <JobForm job={editingJob} onClose={handleCloseForm} />
          </div>
        )}

        {/* Jobs List */}
        <AdminJobsList
          jobs={jobs}
          isLoading={jobsLoading}
          isFounder={isFounder}
          canEditJobs={canEditJobs}
          canDeleteJobs={canDeleteJobs}
          canPostJobs={canPostJobs}
          onEdit={handleEdit}
          onDelete={setDeletingJobId}
          onDuplicate={handleDuplicate}
          onTogglePublished={handleTogglePublished}
          onToggleReviewing={handleToggleReviewing}
          onAddJob={() => setShowForm(true)}
          onBulkUpload={() => setShowBulkUpload(true)}
          duplicateIsPending={duplicateJob.isPending}
        />

        {/* Role Requests - Founder only (TOP PRIORITY) */}
        {isFounder && (
          <div className="mb-8">
            <RoleRequestsPanel />
          </div>
        )}

        {/* Deleted Jobs Trash - Founder only */}
        {isFounder && (
          <div className="mt-8">
            <DeletedJobsPanel />
          </div>
        )}

        {/* Support Tickets Section - Founder only */}
        {isFounder && (
          <div className="mt-8">
            <SupportTicketsPanel />
          </div>
        )}


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
