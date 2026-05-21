import { Layout } from "@/components/Layout";
import { openApplyLink } from "@/lib/openApplyLink";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { format } from "date-fns";
import { ExternalLink, Trash2, Briefcase, Calendar, Loader2, HelpCircle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

const APPLICATION_STATUSES = [
  { value: "applied", label: "Applied", color: "bg-accent" },
  { value: "in_review", label: "In Review", color: "bg-amber-500" },
  { value: "interview", label: "Interview", color: "bg-blue-500" },
  { value: "offer", label: "Offer", color: "bg-success" },
  { value: "rejected", label: "Rejected", color: "bg-destructive" },
];

function getStatusConfig(status: string) {
  return APPLICATION_STATUSES.find((s) => s.value === status) || APPLICATION_STATUSES[0];
}

export default function Applied() {
  const { applications, removeAppliedJob, updateApplicationStatus, isLoading } = useJobContext();
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Applied Jobs
          </h1>
          <p className="text-muted-foreground">
            Track all the positions you've applied to
          </p>
        </div>

        {/* Job List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card className="p-12 text-center border-border/60">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-6">
              Start applying to jobs and they'll appear here
            </p>
            <Link to="/dashboard">
              <Button variant="accent">Browse Jobs</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const job = application.job;
              if (!job) return null;
              const statusConfig = getStatusConfig(application.status);

              return (
                <Card key={application.id} className="p-5 border-border/60 animate-fade-in">
                  <div className="flex items-start gap-4">
                    <CompanyLogo 
                      logoUrl={job.company_logo} 
                      companyName={job.company} 
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-lg leading-tight truncate">
                            {job.title}
                          </h3>
                          <p className="text-muted-foreground font-medium">{job.company}</p>
                        </div>
                        {/* Status Dropdown */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[260px] text-xs">
                                <p className="font-medium mb-1">Update the status as your application progresses to keep track of where you stand.</p>
                                <ul className="space-y-0.5">
                                  <li><span className="font-medium">Applied</span> — Application submitted</li>
                                  <li><span className="font-medium">In Review</span> — Under employer review</li>
                                  <li><span className="font-medium">Interview</span> — Interview scheduled or in progress</li>
                                  <li><span className="font-medium">Offer</span> — Offer received</li>
                                  <li><span className="font-medium">Rejected</span> — Application unsuccessful</li>
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Select
                            value={application.status}
                            onValueChange={(value) => updateApplicationStatus(job.id, value)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {APPLICATION_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                                    {s.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Applied {format(application.applied_at, "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openApplyLink(job.external_apply_link)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Job
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeAppliedJob(job.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
