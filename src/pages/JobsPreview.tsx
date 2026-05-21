import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useToast } from "@/hooks/use-toast";
import { openApplyLink } from "@/lib/openApplyLink";
import { formatJobTimestamp } from "@/lib/jobTimestamp";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  Bookmark,
  Lock,
} from "lucide-react";

interface PreviewJob {
  id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string | null;
  employment_type: string | null;
  salary_range: string | null;
  skills: string[] | null;
  posted_date: string;
  updated_at: string;
  external_apply_link: string | null;
}

const GUEST_APPLY_LIMIT = 5;
const GUEST_APPLY_KEY = "guest_applied_jobs";

function getGuestApplied(): string[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_APPLY_KEY) || "[]");
  } catch {
    return [];
  }
}

function addGuestApplied(jobId: string) {
  const list = getGuestApplied();
  if (!list.includes(jobId)) {
    list.push(jobId);
    localStorage.setItem(GUEST_APPLY_KEY, JSON.stringify(list));
  }
}

const ROLE_PRESETS: { id: string; label: string; keywords: string[] }[] = [
  { id: "all", label: "All Roles", keywords: [] },
  { id: "swe", label: "Software Engineer", keywords: ["software engineer", "developer", "swe"] },
  { id: "data", label: "Data / Analytics", keywords: ["data analyst", "data scientist", "data engineer", "analytics"] },
  { id: "product", label: "Product", keywords: ["product manager", "product owner"] },
  { id: "design", label: "Design", keywords: ["designer", "ui/ux", "ux"] },
  { id: "marketing", label: "Marketing", keywords: ["marketing", "growth", "seo"] },
  { id: "sales", label: "Sales / BD", keywords: ["sales", "account executive", "business development"] },
  { id: "ops", label: "Operations", keywords: ["operations", "supply chain", "coordinator"] },
  { id: "finance", label: "Finance", keywords: ["finance", "accountant", "financial analyst"] },
  { id: "ai", label: "AI / ML", keywords: ["machine learning", "ai engineer", "ml engineer"] },
];

const ROLE_STORAGE_KEY = "guest_preferred_role";

function usePublicJobsPreview(roleKeywords: string[]) {
  return useQuery({
    queryKey: ["public-jobs-preview", roleKeywords.join("|")],
    queryFn: async (): Promise<PreviewJob[]> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      let query = supabase
        .from("jobs")
        .select(
          "id, title, company, company_logo, location, employment_type, salary_range, skills, posted_date, updated_at, external_apply_link"
        )
        .eq("is_published", true)
        .eq("is_archived", false)
        .eq("is_direct_apply", true)
        .is("deleted_at", null)
        .gte("posted_date", cutoff.toISOString());
      if (roleKeywords.length > 0) {
        const ors = roleKeywords.map((k) => `title.ilike.%${k}%`).join(",");
        query = query.or(ors);
      }
      const { data, error } = await query.order("posted_date", { ascending: false }).limit(25);
      if (error) throw error;
      return (data ?? []) as PreviewJob[];
    },
    staleTime: 60_000,
  });
}

function getLocationBadge(location: string) {
  const loc = location.toLowerCase();
  if (loc.includes("remote")) return "bg-success-bg text-success-text";
  if (loc.includes("hybrid")) return "bg-tab-selected-bg text-tab-selected-text";
  return "bg-secondary text-foreground";
}

export default function JobsPreview() {
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    try {
      return localStorage.getItem(ROLE_STORAGE_KEY) || "all";
    } catch {
      return "all";
    }
  });
  const activeRole = ROLE_PRESETS.find((r) => r.id === selectedRole) ?? ROLE_PRESETS[0];
  const { data: jobs, isLoading, error } = usePublicJobsPreview(activeRole.keywords);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [appliedIds, setAppliedIds] = useState<string[]>(() => getGuestApplied());

  const handleSelectRole = useCallback((roleId: string) => {
    setSelectedRole(roleId);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, roleId);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Browse Jobs — Sociax";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const remaining = Math.max(0, GUEST_APPLY_LIMIT - appliedIds.length);

  const handleApply = useCallback(
    (job: PreviewJob) => {
      const already = appliedIds.includes(job.id);
      if (already) {
        openApplyLink(job.external_apply_link);
        return;
      }
      if (appliedIds.length >= GUEST_APPLY_LIMIT) {
        toast({
          title: "Free preview limit reached",
          description: "Create a free account to keep applying — it takes 10 seconds.",
        });
        navigate("/auth?signup=true");
        return;
      }
      addGuestApplied(job.id);
      setAppliedIds((prev) => [...prev, job.id]);
      openApplyLink(job.external_apply_link);
      const left = GUEST_APPLY_LIMIT - (appliedIds.length + 1);
      toast({
        title: "Application opened",
        description:
          left > 0
            ? `${left} free application${left === 1 ? "" : "s"} left before signup.`
            : "That was your last free application. Sign up to keep going.",
      });
    },
    [appliedIds, navigate, toast]
  );

  const handleSaveGuest = useCallback(() => {
    toast({
      title: "Sign up to save jobs",
      description: "Saved jobs sync across all your devices.",
    });
    navigate("/auth?signup=true");
  }, [navigate, toast]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 border-accent/30 text-accent">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Live job preview
            </Badge>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Latest jobs on Sociax
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Apply to up to <span className="text-foreground font-semibold">{GUEST_APPLY_LIMIT} jobs free</span> — no account
              needed. Sign up to unlock unlimited applications, saved jobs, and AI match scores.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              <span className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                {remaining} of {GUEST_APPLY_LIMIT} free applications left
              </span>
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link to="/auth?signup=true">
                <Button size="lg" className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="rounded-full">
                  Log in
                </Button>
              </Link>
            </div>
          </div>

          {/* Role filter pills */}
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground text-center mb-3">
              Pick a role to see relevant jobs
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {ROLE_PRESETS.map((r) => {
                const active = r.id === selectedRole;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-accent text-accent-foreground border-accent shadow-glow"
                        : "bg-secondary/40 text-muted-foreground border-border/40 hover:border-accent/40 hover:text-foreground"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job list */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-20 text-muted-foreground">
              Couldn't load jobs right now. Please refresh.
            </div>
          )}

          {!isLoading && !error && jobs && jobs.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No jobs available right now — check back soon.
            </div>
          )}

          <div className="grid gap-4">
            {jobs?.map((job, i) => {
              const applied = appliedIds.includes(job.id);
              const locationValid =
                job.location &&
                !/nan/i.test(job.location) &&
                !/not specified/i.test(job.location) &&
                job.location.trim() !== "" &&
                job.location.length < 100;
              const salaryValid =
                job.salary_range &&
                !/nan/i.test(job.salary_range) &&
                !/none/i.test(job.salary_range) &&
                !/not specified/i.test(job.salary_range);

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Card className="group p-5 border border-border/60 bg-card rounded-2xl relative overflow-visible transition-all duration-300 ease-out hover:-translate-y-1 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_1px_3px_hsl(var(--foreground)/0.03)] hover:shadow-[0_10px_30px_-10px_hsl(var(--foreground)/0.12)] hover:border-border dark:hover:border-accent/30">
                    {/* Header Row */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <CompanyLogo
                        logoUrl={job.company_logo}
                        companyName={job.company}
                        size="md"
                        className="rounded-xl shrink-0 ring-1 ring-border/30"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-display font-semibold text-foreground text-base leading-tight">
                              {job.title}
                            </h3>
                            <p className="text-accent font-semibold text-sm mt-0.5">
                              {job.company
                                ?.replace(/&amp;/g, "&")
                                .replace(/&#39;/g, "'")
                                .replace(/&quot;/g, '"')}
                            </p>
                            <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {locationValid ? job.location!.split(",")[0] : "Location not specified"}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20 whitespace-nowrap shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatJobTimestamp(new Date(job.updated_at))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meta Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {locationValid && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getLocationBadge(
                            job.location!
                          )}`}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}
                      {salaryValid && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                          <DollarSign className="h-3.5 w-3.5" />
                          {job.salary_range}
                        </span>
                      )}
                      {job.employment_type && !/nan/i.test(job.employment_type) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-medium">
                          <Briefcase className="h-3.5 w-3.5" />
                          {job.employment_type}
                        </span>
                      )}
                    </div>

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {job.skills.slice(0, 7).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs font-normal px-2.5 py-1 rounded-full bg-secondary/50 text-foreground border-border/40"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 7 && (
                          <Badge
                            variant="outline"
                            className="text-xs font-normal px-2.5 py-1 rounded-full text-muted-foreground"
                          >
                            +{job.skills.length - 7} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* AI Actions (locked) */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {["ATS Check", "Cover Letter", "Tailored Resume"].map((label) => (
                        <Button
                          key={label}
                          variant="outline"
                          size="sm"
                          onClick={handleSaveGuest}
                          className="text-xs font-medium h-7 px-3 rounded-full border-border/50 bg-secondary/50 text-muted-foreground hover:bg-accent/10 hover:text-accent hover:border-accent/40"
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          {label}
                        </Button>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveGuest}
                        className="h-9 px-3 text-sm font-normal gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <Bookmark className="h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApply(job)}
                        className={`h-9 px-5 text-sm font-medium rounded-full gap-1.5 group/btn transition-all duration-200 active:scale-95 ${
                          applied
                            ? "bg-secondary text-foreground border border-border"
                            : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-glow btn-glow"
                        }`}
                      >
                        {applied ? (
                          "Applied ✓"
                        ) : (
                          <>
                            Apply Now
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Footer CTA */}
          {jobs && jobs.length > 0 && (
            <div className="mt-10 p-6 rounded-2xl border border-accent/30 bg-accent/5 text-center">
              <h3 className="font-display text-xl font-bold text-foreground">
                Unlock the full job board
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                Free account: unlimited applications, AI match scores, saved lists, application tracker, and resume tools.
              </p>
              <Link to="/auth?signup=true">
                <Button className="mt-4 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
