import { Linkedin } from "lucide-react";

export function LinkedInFeatureAnnouncementInline() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/30 bg-card/60 px-4 py-2.5 text-xs text-foreground/80">
      <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-semibold shrink-0">NEW</span>
      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
      <span>
        Generate LinkedIn connection messages — click <span className="font-medium text-accent">"Connect on LinkedIn"</span> on any job
      </span>
    </div>
  );
}
