import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight, BookmarkCheck } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useAuth } from "@/context/AuthContext";
import { openApplyLink } from "@/lib/openApplyLink";

interface FeaturedJob {
  id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string;
  is_reviewing: boolean;
  external_apply_link: string;
  employment_type: string;
}

export function FeaturedJobCard() {
  const [job, setJob] = useState<FeaturedJob | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("jobs")
      .select("id, title, company, company_logo, location, is_reviewing, external_apply_link, employment_type")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("posted_date", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setJob(data);
      });
  }, []);

  const handleApply = () => {
    if (!user) {
      // Store the link so we could redirect after login
      sessionStorage.setItem("pending_apply_link", job?.external_apply_link || "");
      navigate("/auth");
      return;
    }
    openApplyLink(job!.external_apply_link);
  };

  const handleCardClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/dashboard");
  };

  const isRemote = job?.location?.toLowerCase().includes("remote");

  // Fallback placeholder
  const title = job?.title ?? "Senior Developer";
  const company = job?.company ?? "TechCorp Inc.";
  const reviewing = job?.is_reviewing ?? false;
  const locationLabel = isRemote ? "Remote" : job?.location?.split(",")[0] ?? "Remote";

  return (
    <div
      className="bg-card rounded-2xl border border-border/50 p-6 shadow-premium card-glow tilt-card cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3 mb-4">
        {job?.company_logo ? (
          <CompanyLogo companyName={company} logoUrl={job.company_logo} size="md" />
        ) : (
          <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center shadow-glow">
            <Briefcase className="h-5 w-5 text-accent-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display font-semibold text-foreground truncate">{title}</p>
          <p className="text-sm text-muted-foreground truncate">{company}</p>
        </div>
      </div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {reviewing && (
          <span className="px-3 py-1 rounded-full bg-success-bg text-success-text text-xs font-medium">
            ● Actively Reviewing
          </span>
        )}
        <span className="px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-medium">
          {locationLabel}
        </span>
        {job?.employment_type && (
          <span className="px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-medium">
            {job.employment_type}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 group btn-glow"
          onClick={(e) => {
            e.stopPropagation();
            handleApply();
          }}
        >
          Apply Now
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            if (!user) {
              navigate("/auth");
            } else {
              navigate("/dashboard");
            }
          }}
        >
          <BookmarkCheck className="h-3.5 w-3.5 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}
