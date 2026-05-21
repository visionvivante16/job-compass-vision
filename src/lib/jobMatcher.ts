import { Job } from "@/types/job";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";

export type MatchTier = "perfect" | "strong" | "explore" | "expand";

export interface JobMatchResult {
  score: number; // 0-100
  tier: MatchTier;
  tierLabel: string;
  tierColor: string; // tailwind classes
  scoreColor: string; // tailwind classes for the % badge
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
}

const TIER_CONFIG: Record<MatchTier, { label: string; color: string }> = {
  perfect: { label: "✦ Perfect Match", color: "bg-accent/15 text-accent border-accent/30" },
  strong: { label: "Strong Match", color: "bg-primary/15 text-primary border-primary/30" },
  explore: { label: "Explore →", color: "bg-[hsl(270,60%,60%)]/15 text-[hsl(270,60%,60%)] border-[hsl(270,60%,60%)]/30" },
  expand: { label: "New Direction", color: "bg-muted text-muted-foreground border-border/50" },
};

function normalizeSkill(s: string): string {
  return s.toLowerCase().trim().replace(/[.\-_]/g, "");
}

function skillsOverlap(jobSkills: string[], userSkills: string[]): { matched: string[]; missing: string[] } {
  const userSet = new Set(userSkills.map(normalizeSkill));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    const norm = normalizeSkill(skill);
    // Check direct match or partial match
    const isMatch = userSet.has(norm) || [...userSet].some(us => norm.includes(us) || us.includes(norm));
    if (isMatch) matched.push(skill);
    else missing.push(skill);
  }

  return { matched, missing };
}

function titleSimilarity(jobTitle: string, primaryRole: string, targetTitles: string[]): number {
  const jt = jobTitle.toLowerCase();
  const pr = primaryRole.toLowerCase();

  // Exact primary role match
  if (jt.includes(pr) || pr.includes(jt)) return 1;

  // Check target titles — treated as near-equal to primary role
  for (const tt of targetTitles) {
    const ttl = tt.toLowerCase();
    if (jt.includes(ttl) || ttl.includes(jt)) return 0.95;
  }

  // Partial keyword overlap
  const jobWords = new Set(jt.split(/[\s,/\-]+/).filter(w => w.length > 2));
  const roleWords = new Set(pr.split(/[\s,/\-]+/).filter(w => w.length > 2));
  const allTargetWords = new Set(targetTitles.flatMap(t => t.toLowerCase().split(/[\s,/\-]+/).filter(w => w.length > 2)));
  
  let overlap = 0;
  for (const w of jobWords) {
    if (roleWords.has(w) || allTargetWords.has(w)) overlap++;
  }

  return jobWords.size > 0 ? Math.min(overlap / jobWords.size, 0.6) : 0;
}

const EXPERIENCE_LEVELS: Record<string, number> = {
  fresher: 0.5, junior: 2, mid: 4.5, senior: 8, lead: 12,
};

function experienceMatch(jobExpStr: string | null, intelligence: ResumeIntelligence): number {
  const userYears = intelligence.yearsOfExperience ?? EXPERIENCE_LEVELS[intelligence.experienceLevel] ?? 3;

  // Classify the job's seniority bucket from its required-years string.
  let jobBucket: "entry" | "mid" | "senior" = "mid";
  if (jobExpStr) {
    const nums = jobExpStr.match(/(\d+)/g);
    const minReq = nums ? parseInt(nums[0]) : null;
    if (minReq !== null) {
      if (minReq < 2) jobBucket = "entry";
      else if (minReq < 5) jobBucket = "mid";
      else jobBucket = "senior";
    }
  }

  // User bucket → score per job bucket (0..1, scaled to the 20-pt experience weight)
  if (userYears <= 2) {
    return jobBucket === "entry" ? 1 : jobBucket === "mid" ? 0.5 : 0;
  }
  if (userYears <= 5) {
    return jobBucket === "mid" ? 1 : jobBucket === "entry" ? 0.75 : 0.25;
  }
  return jobBucket === "senior" ? 1 : jobBucket === "mid" ? 0.75 : 0.25;
}

export function calculateJobMatch(job: Job, intelligence: ResumeIntelligence): JobMatchResult {
  const allUserSkills = [...(intelligence.topSkills || []), ...(intelligence.secondarySkills || []), ...(intelligence.primaryStack || [])];
  const { matched, missing } = skillsOverlap(job.skills, allUserSkills);

  const skillRatio = job.skills.length > 0 ? matched.length / job.skills.length : 0.5;
  const titleScore = titleSimilarity(job.title, intelligence.primaryRole, intelligence.jobTitlesToTarget || []);
  const expScore = experienceMatch(job.experience_years, intelligence);

  // Weighted score — skills 50%, title 30%, experience 20%
  const rawScore = (skillRatio * 50) + (titleScore * 30) + (expScore * 20);
  const score = Math.min(Math.round(rawScore), 100);

  // Determine tier
  let tier: MatchTier;
  if (titleScore >= 0.8 && skillRatio >= 0.7 && expScore >= 0.8) {
    tier = "perfect";
  } else if ((titleScore >= 0.5 && skillRatio >= 0.5) || score >= 60) {
    tier = "strong";
  } else if (skillRatio >= 0.3 || titleScore >= 0.3) {
    tier = "explore";
  } else {
    tier = "expand";
  }

  const config = TIER_CONFIG[tier];

  // Score color
  let scoreColor: string;
  if (score >= 80) scoreColor = "bg-success/15 text-success";
  else if (score >= 60) scoreColor = "bg-primary/15 text-primary";
  else if (score >= 40) scoreColor = "bg-warning/15 text-warning";
  else scoreColor = "bg-muted text-muted-foreground";

  // Build reason
  const reasons: string[] = [];
  if (matched.length > 0) reasons.push(`Matches: ${matched.slice(0, 4).join(", ")}`);
  if (missing.length > 0) reasons.push(`Missing: ${missing.slice(0, 3).join(", ")}`);

  return {
    score,
    tier,
    tierLabel: config.label,
    tierColor: config.color,
    scoreColor,
    matchedSkills: matched,
    missingSkills: missing,
    reason: reasons.join("\n"),
  };
}

export function calculateMatchesForJobs(
  jobs: Job[],
  intelligence: ResumeIntelligence | null | undefined
): Map<string, JobMatchResult> {
  const results = new Map<string, JobMatchResult>();
  if (!intelligence) return results;

  for (const job of jobs) {
    results.set(job.id, calculateJobMatch(job, intelligence));
  }

  return results;
}
