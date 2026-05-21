import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Crown, Plus, FileSpreadsheet, Users, Bug, CreditCard } from "lucide-react";

interface AdminHeaderProps {
  isFounder: boolean;
  showForm: boolean;
  showBulkUpload: boolean;
  canPostJobs: boolean;
  canImportGoogleSheet: boolean;
  onAddJob: () => void;
  onBulkUpload: () => void;
}

export function AdminHeader({
  isFounder,
  showForm,
  showBulkUpload,
  canPostJobs,
  canImportGoogleSheet,
  onAddJob,
  onBulkUpload,
}: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
          {isFounder ? (
            <Crown className="h-5 w-5 text-accent-foreground" />
          ) : (
            <Shield className="h-5 w-5 text-accent-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isFounder ? "Founder Dashboard" : "Employer Admin"}
          </h1>
          <p className="text-muted-foreground">
            {isFounder ? "Full access to all jobs and settings" : "Manage your job listings"}
          </p>
        </div>
      </div>

      {!showForm && !showBulkUpload && (
        <div className="flex gap-2">
          {isFounder && (
            <>
              <Link to="/admin/payments">
                <Button variant="outline">
                  <CreditCard className="h-4 w-4" />
                  Payments
                </Button>
              </Link>
              <a href="/admin/error-logs" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Bug className="h-4 w-4" />
                  Error Logs
                </Button>
              </a>
              <Link to="/founder/employers">
                <Button variant="outline">
                  <Users className="h-4 w-4" />
                  Manage Employers
                </Button>
              </Link>
            </>
          )}
          {(isFounder || canImportGoogleSheet) && (
            <Link to="/admin/import">
              <Button variant="outline">
                <FileSpreadsheet className="h-4 w-4" />
                Google Sheet Import
              </Button>
            </Link>
          )}
          {(isFounder || canPostJobs) && (
            <>
              <Button variant="outline" onClick={onBulkUpload}>
                <FileSpreadsheet className="h-4 w-4" />
                CSV Upload
              </Button>
              <Button variant="accent" onClick={onAddJob}>
                <Plus className="h-4 w-4" />
                Add Job
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
