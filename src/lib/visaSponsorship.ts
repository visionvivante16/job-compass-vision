import { Job } from "@/types/job";
import { isHighExperienceJob, isNonEntryLevelJob } from "./jobFilters";

export type SponsorshipStatus = "sponsors" | "opt_friendly" | "stem_opt" | "unlikely" | "unknown";

export interface VisaSponsorshipResult {
  status: SponsorshipStatus;
  visaTypes: string[];
  confidence: "high" | "medium" | "low";
  label: string;
  emoji: string;
  badgeClass: string;
}

// Known large H1B sponsors (Fortune 500 / Big Tech)
const KNOWN_SPONSORS = new Set([
  "google", "meta", "amazon", "microsoft", "apple", "netflix", "uber", "lyft",
  "airbnb", "stripe", "salesforce", "oracle", "ibm", "intel", "cisco", "adobe",
  "nvidia", "qualcomm", "vmware", "paypal", "twitter", "snap", "pinterest",
  "linkedin", "github", "slack", "dropbox", "zoom", "shopify", "databricks",
  "snowflake", "palantir", "doordash", "instacart", "coinbase", "robinhood",
  "square", "block", "twilio", "cloudflare", "datadog", "splunk", "servicenow",
  "workday", "atlassian", "figma", "notion", "canva", "tiktok", "bytedance",
  "jpmorgan", "goldman sachs", "morgan stanley", "deloitte", "accenture",
  "mckinsey", "bcg", "bain", "pwc", "ey", "kpmg", "infosys", "tcs", "wipro",
  "cognizant", "capgemini", "hcl", "tech mahindra", "tesla", "spacex",
  "samsung", "sony", "toyota", "honda", "boeing", "lockheed martin",
  "raytheon", "northrop grumman", "general electric", "ge", "3m",
  "procter & gamble", "johnson & johnson", "pfizer", "moderna", "merck",
  "abbvie", "eli lilly", "amgen", "gilead", "biogen",
  "walmart", "target", "costco", "kroger", "cvs", "walgreens",
  "bank of america", "citigroup", "wells fargo", "capital one", "american express",
  "visa", "mastercard",
]);

const SPONSOR_POSITIVE = [
  "will sponsor", "sponsorship available", "sponsorship provided",
  "h1b sponsor", "h-1b sponsor", "visa sponsorship", "work visa",
  "sponsor h1b", "sponsor h-1b", "visa support", "immigration support",
  "sponsorship offered", "sponsor work visa", "sponsor visas",
  "open to sponsorship", "provides sponsorship",
];

// Strict OPT signals — must be explicit visa/work-authorization terms.
// "recent graduates" / "new grad" alone are NOT visa signals.
const SPONSOR_OPT = [
  "opt", "optional practical training", "opt friendly", "opt eligible",
  "f-1", "f1 visa", "cpt", "curricular practical training",
];

const SPONSOR_STEM_OPT = [
  "stem opt", "stem-opt", "stem extension", "24-month opt",
  "stem eligible",
];

// Word-boundary regex for short tokens like "opt", "cpt", "f-1" to avoid
// false positives ("optional", "captain", etc.). "opt" must appear as a
// standalone token, not inside another word.
const OPT_STRICT_REGEX = /\b(opt|cpt|f-1|f1)\b/i;

const SPONSOR_NEGATIVE = [
  "must be authorized to work", "no sponsorship", "citizens only",
  "us citizen", "u.s. citizen", "permanent resident only",
  "security clearance required", "clearance required",
  "cannot sponsor", "will not sponsor", "not sponsor",
  "authorized to work in the us", "authorized to work in the united states",
  "without sponsorship", "no visa sponsorship", "not able to sponsor",
  "legally authorized", "work authorization required",
  "cannot be considered", "will not be considered", "not be considered",
  "unable to sponsor", "do not sponsor", "does not sponsor",
  "are not able to sponsor", "are unable to sponsor",
  "no visa sponsorship is available", "sponsorship is not available",
  "sponsorship not available", "sponsorship will not be provided",
  "not offer sponsorship", "do not offer sponsorship",
  "without the need for sponsorship", "without requiring sponsorship",
];

// Phrases that, when present near a "sponsorship" mention, flip it negative.
// Catches patterns like "visa sponsorship ... cannot be considered" or
// "candidates requiring sponsorship will not be considered".
const NEGATION_NEAR_SPONSORSHIP = [
  "cannot be considered", "will not be considered", "not be considered",
  "unable to", "not able to", "do not", "does not", "will not",
  "no longer", "ineligible",
];

export function analyzeVisaSponsorship(job: Job): VisaSponsorshipResult {
  const text = `${job.title} ${job.description} ${job.company}`.toLowerCase();
  const companyLower = job.company.toLowerCase().trim();

  // Check negative signals first
  const hasNegative = SPONSOR_NEGATIVE.some(s => text.includes(s));

  // Detect sponsorship phrases that appear in a negative/refusal context.
  // E.g. "visa sponsorship ... cannot be considered" within a 120-char window.
  const sponsorshipMentions = [...text.matchAll(/\b(visa\s+sponsorship|sponsorship|sponsor\s+(?:a\s+)?visa|h-?1b\s+sponsor)/g)];
  const hasNegatedSponsorship = sponsorshipMentions.some(m => {
    const start = Math.max(0, (m.index ?? 0) - 60);
    const end = Math.min(text.length, (m.index ?? 0) + (m[0]?.length ?? 0) + 120);
    const window = text.slice(start, end);
    return NEGATION_NEAR_SPONSORSHIP.some(neg => window.includes(neg));
  });

  // Only count positive signals if they are NOT in a negated context
  const hasPositive = SPONSOR_POSITIVE.some(s => text.includes(s)) && !hasNegatedSponsorship;
  // Strict OPT detection: explicit phrase OR word-boundary token match
  const hasOpt = SPONSOR_OPT.some(s => text.includes(s)) || OPT_STRICT_REGEX.test(text);
  const hasStemOpt = SPONSOR_STEM_OPT.some(s => text.includes(s));
  const isKnownSponsor = KNOWN_SPONSORS.has(companyLower) ||
    Array.from(KNOWN_SPONSORS).some(s => companyLower.includes(s));

  // Treat negated-sponsorship as an explicit negative
  const effectiveNegative = hasNegative || hasNegatedSponsorship;

  // Senior / high-experience guard: never auto-tag OPT/STEM-OPT for senior roles
  // unless the description explicitly mentions sponsorship/visa terms.
  const isSenior = isHighExperienceJob(job) || isNonEntryLevelJob(job);
  if (isSenior && !hasPositive) {
    return {
      status: "unknown",
      visaTypes: [],
      confidence: "low",
      label: "❓ Not specified",
      emoji: "❓",
      badgeClass: "bg-muted text-muted-foreground border-border/40",
    };
  }

  // Explicit negative overrides (including negated sponsorship phrases)
  if (effectiveNegative && !hasPositive) {
    return {
      status: "unlikely",
      visaTypes: [],
      confidence: "high",
      label: "⚠️ Sponsorship unlikely",
      emoji: "⚠️",
      badgeClass: "bg-warning/10 text-warning border-warning/20",
    };
  }

  // Explicit positive
  if (hasPositive) {
    const visaTypes: string[] = ["H1B"];
    if (hasOpt || hasStemOpt) visaTypes.push("OPT");
    if (hasStemOpt) visaTypes.push("STEM OPT");
    return {
      status: "sponsors",
      visaTypes,
      confidence: "high",
      label: "H1B Sponsoring",
      emoji: "✅",
      badgeClass: "bg-success/10 text-success border-success/20",
    };
  }

  // STEM OPT signals
  if (hasStemOpt) {
    return {
      status: "stem_opt",
      visaTypes: ["STEM OPT", "OPT"],
      confidence: "medium",
      label: "STEM OPT Accepting",
      emoji: "🌟",
      badgeClass: "bg-success/10 text-success border-success/20",
    };
  }

  // OPT signals
  if (hasOpt) {
    return {
      status: "opt_friendly",
      visaTypes: ["OPT"],
      confidence: "medium",
      label: "OPT Accepting",
      emoji: "🎓",
      badgeClass: "bg-success/10 text-success border-success/20",
    };
  }

  // Known sponsor company with no explicit mention (skip if negated)
  if (isKnownSponsor && !effectiveNegative) {
    return {
      status: "sponsors",
      visaTypes: ["H1B"],
      confidence: "medium",
      label: "H1B Sponsoring",
      emoji: "✅",
      badgeClass: "bg-success/10 text-success border-success/20",
    };
  }

  return {
    status: "unknown",
    visaTypes: [],
    confidence: "low",
    label: "❓ Not specified",
    emoji: "❓",
    badgeClass: "bg-muted text-muted-foreground border-border/40",
  };
}

export type VisaFilter = "all" | "h1b" | "opt";

export function filterJobsByVisa(jobs: Job[], filter: VisaFilter): Job[] {
  if (filter === "all") {
    // Show only jobs with any visa-friendly signal
    return jobs.filter(job => {
      const r = analyzeVisaSponsorship(job);
      return r.status === "sponsors" || r.status === "opt_friendly" || r.status === "stem_opt";
    });
  }

  return jobs.filter(job => {
    const result = analyzeVisaSponsorship(job);
    switch (filter) {
      case "h1b":
        // True H1B sponsors only — exclude OPT-only jobs
        return result.status === "sponsors";
      case "opt":
        // OPT and STEM OPT friendly roles
        return result.status === "opt_friendly" || result.status === "stem_opt";
      default:
        return true;
    }
  });
}
