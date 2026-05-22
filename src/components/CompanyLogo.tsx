import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  logoUrl: string | null;
  companyName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Filter out ATS platform logos (Greenhouse, Lever, etc.) and LinkedIn logos.
// Google favicon URLs (google.com/s2/favicons) are always allowed — they're
// just small icons even when the domain points to an ATS host.
function isAtsLogo(url: string): boolean {
  const l = url.toLowerCase();
  // Always allow Google favicon service regardless of target domain
  if (l.includes('google.com/s2/favicons') || l.includes('gstatic.com/faviconv2')) {
    return false;
  }
  return (
    l.includes('greenhouse') ||
    l.includes('lever.co') ||
    l.includes('workday') ||
    l.includes('icims') ||
    l.includes('taleo') ||
    l.includes('smartrecruiters') ||
    l.includes('jobvite') ||
    l.includes('linkedin') ||
    l.includes('licdn') ||
    l.includes('media.licdn') ||
    l.includes('static.licdn')
  );
}

// Guess a likely domain from a company name (e.g. "Acme Corp" -> "acmecorp.com").
// Strips common suffixes (Inc, LLC, Ltd, Corp, Co, etc.) and non-alphanumerics.
function guessDomain(name: string): string | null {
  if (!name) return null;
  const cleaned = name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|company|gmbh|ag|sa|plc|holdings|group|the)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  return `${cleaned}.com`;
}

function getFallbackLogoUrl(companyName: string): string | null {
  const domain = guessDomain(companyName);
  if (!domain) return null;
  // Google favicon service — free, cached, no API key needed
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export function CompanyLogo({ logoUrl, companyName, size = "md", className }: CompanyLogoProps) {
  const primaryLogoUrl = logoUrl && !isAtsLogo(logoUrl) ? logoUrl : null;
  const fallbackLogoUrl = !primaryLogoUrl ? getFallbackLogoUrl(companyName) : null;
  const effectiveLogoUrl = primaryLogoUrl || fallbackLogoUrl;
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Generate a gradient based on company name
  const getGradient = (name: string) => {
    const safeName = name || "";
    const hash = safeName.split("").reduce((acc, c) => c.charCodeAt(0) + acc, 0);
    const gradients = [
      "from-accent/20 to-accent/5",
      "from-success/20 to-success/5",
      "from-destructive/20 to-destructive/5",
      "from-accent/15 to-success/10",
      "from-primary/10 to-accent/10",
    ];
    return gradients[hash % gradients.length];
  };

  return (
    <Avatar className={cn(sizeClasses[size], "rounded-xl shrink-0", className)}>
      {effectiveLogoUrl ? (
        <AvatarImage
          src={effectiveLogoUrl}
          alt={`${companyName} logo`}
          className="object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
      <AvatarFallback className={cn(
        "rounded-xl font-display font-semibold bg-gradient-to-br",
        getGradient(companyName),
        "text-foreground"
      )}>
        {companyName ? getInitials(companyName) : <Building2 className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
