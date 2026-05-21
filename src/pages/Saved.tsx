import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  Bookmark,
  ExternalLink,
  Trash2,
  MapPin,
  Loader2,
  FolderPlus,
  Folder,
  ChevronDown,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { formatJobTimestamp } from "@/lib/jobTimestamp";

const DEFAULT_FOLDER = "All";

export default function Saved() {
  const { savedJobs, unsaveJob, applyToJob, isApplied, isLoading, updateSavedFolder } = useJobContext();
  const { user, isLoading: authLoading } = useAuth();
  const [activeFolder, setActiveFolder] = useState<string>(DEFAULT_FOLDER);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  const folders = useMemo(() => {
    const set = new Set<string>([DEFAULT_FOLDER]);
    savedJobs.forEach((s) => set.add(s.folder || DEFAULT_FOLDER));
    return Array.from(set);
  }, [savedJobs]);

  const filteredJobs = useMemo(() => {
    if (activeFolder === DEFAULT_FOLDER) return savedJobs;
    return savedJobs.filter((s) => (s.folder || DEFAULT_FOLDER) === activeFolder);
  }, [savedJobs, activeFolder]);

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

  const handleMove = (jobId: string, folder: string) => {
    updateSavedFolder(jobId, folder);
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name || !pendingJobId) return;
    updateSavedFolder(pendingJobId, name);
    setActiveFolder(name);
    setNewFolderName("");
    setPendingJobId(null);
    setNewFolderOpen(false);
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Saved Jobs
          </h1>
          <p className="text-muted-foreground">
            Organize bookmarked roles into folders
          </p>
        </div>

        {/* Folder tabs */}
        {savedJobs.length > 0 && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {folders.map((f) => {
              const count =
                f === DEFAULT_FOLDER
                  ? savedJobs.length
                  : savedJobs.filter((s) => (s.folder || DEFAULT_FOLDER) === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFolder(f)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeFolder === f
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card text-foreground border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <Folder className="h-3 w-3" />
                  {f}
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Job List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading saved jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="p-12 text-center border-border/60">
            <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              {savedJobs.length === 0 ? "No saved jobs" : `No jobs in "${activeFolder}"`}
            </h3>
            <p className="text-muted-foreground mb-6">
              {savedJobs.length === 0
                ? "Save jobs you're interested in to review them later"
                : "Move existing saved jobs into this folder using the menu on each card."}
            </p>
            <Link to="/dashboard">
              <Button variant="accent">Browse Jobs</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((savedJob) => {
              const job = savedJob.job;
              if (!job) return null;
              const applied = isApplied(job.id);
              const currentFolder = savedJob.folder || DEFAULT_FOLDER;
              const otherFolders = folders.filter((f) => f !== DEFAULT_FOLDER && f !== currentFolder);

              return (
                <Card key={savedJob.id} className="p-5 border-border/60 animate-fade-in">
                  <div className="flex items-start gap-4">
                    <CompanyLogo logoUrl={job.company_logo} companyName={job.company} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-lg leading-tight truncate">
                            {job.title}
                          </h3>
                          <p className="text-muted-foreground font-medium">{job.company}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {applied && <Badge variant="accent">Applied</Badge>}
                          {job.is_reviewing && <Badge variant="success">Actively Reviewing</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                        <span>Posted {formatJobTimestamp(job.posted_date)}</span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60 flex-wrap">
                    <Button
                      variant={applied ? "secondary" : "accent"}
                      size="sm"
                      onClick={() => applyToJob(job)}
                    >
                      {applied ? (
                        "Already Applied"
                      ) : (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Apply Now
                        </>
                      )}
                    </Button>

                    {/* Folder menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Folder className="h-3.5 w-3.5" />
                          {currentFolder}
                          <ChevronDown className="h-3 w-3 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel className="text-xs">Move to folder</DropdownMenuLabel>
                        {currentFolder !== DEFAULT_FOLDER && (
                          <DropdownMenuItem onClick={() => handleMove(job.id, DEFAULT_FOLDER)}>
                            <Folder className="h-3.5 w-3.5 mr-2" />
                            All (remove from folder)
                          </DropdownMenuItem>
                        )}
                        {otherFolders.map((f) => (
                          <DropdownMenuItem key={f} onClick={() => handleMove(job.id, f)}>
                            <Folder className="h-3.5 w-3.5 mr-2" />
                            {f}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setPendingJobId(job.id);
                            setNewFolderOpen(true);
                          }}
                        >
                          <FolderPlus className="h-3.5 w-3.5 mr-2" />
                          New folder…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                      onClick={() => unsaveJob(job.id)}
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

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Dream companies, Backups"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create & move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
