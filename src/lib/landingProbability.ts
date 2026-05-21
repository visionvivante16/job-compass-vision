import { Job } from "@/types/job";
import { JobMatchResult } from "@/lib/jobMatcher";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { differenceInDays } from "date-fns";

export interface LandingProbabilityResult {
  probability: number; // 0-100
  breakdown: LandingBreakdownItem[];
  message: string;
  messageEmoji: string;
  color: string; // tailwind classes
}

export interface LandingBreakdownItem {
  label: string;
  status: "positive" | "warning" | "negative";
  detail: string;
  impact: string; // e.g. "+25%"
}

export function calculateLandingProbability(
  job: Job,
  matchResult: JobMatchResult | undefined,
  intelligence: ResumeIntelligence | null | undefined
): LandingProbabilityResult | null {
  if (!intelligence || !matchResult) return null;

  const breakdown: LandingBreakdownItem[] = [];
  let score = 0;

  // 1. Experience level match (max +25)
  const expScore = getExperienceScore(job, intelligence);
  score += expScore.points;
  breakdown.push(expScore.item);

  // 2. Core skills overlap (max +30)
  const skillScore = getSkillScore(matchResult);
  score += skillScore.points;
  breakdown.push(skillScore.item);

  // 3. Missing skills penalty (max -15)
  const missingScore = getMissingSkillScore(matchResult);
  score += missingScore.points;
  if (missingScore.item) breakdown.push(missingScore.item);

  // 4. Education relevance (max +15)
  const eduScore = getEducationScore(intelligence);
  score += eduScore.points;
  breakdown.push(eduScore.item);

  // 5. Recency bonus (max +10)
  const recencyScore = getRecencyScore(job);
  score += recencyScore.points;
  breakdown.push(recencyScore.item);

  // 6. Title match bonus (max +10)
  const titleScore = getTitleScore(job, intelligence);
  score += titleScore.points;
  breakdown.push(titleScore.item);

  const probability = Math.max(5, Math.min(98, Math.round(score)));

  let message: string;
  let messageEmoji: string;
  let color: string;

  if (probability >= 80) {
    message = "You're a top candidate! Apply now 🚀";
    messageEmoji = "🚀";
    color = "text-success";
  } else if (probability >= 60) {
    message = "Strong fit — worth applying! 💪";
    messageEmoji = "💪";
    color = "text-primary";
  } else if (probability >= 40) {
    message = "Decent match — customize resume first";
    messageEmoji = "📝";
    color = "text-warning";
  } else {
    message = "Stretch role — but possible! 🎯";
    messageEmoji = "🎯";
    color = "text-muted-foreground";
  }

  return { probability, breakdown, message, messageEmoji, color };
}

function getExperienceScore(job: Job, intelligence: ResumeIntelligence) {
  const LEVELS: Record<string, number> = { fresher: 0.5, junior: 2, mid: 4.5, senior: 8, lead: 12 };
  const userYears = intelligence.yearsOfExperience ?? LEVELS[intelligence.experienceLevel] ?? 3;

  if (!job.experience_years) {
    return {
      points: 18,
      item: { label: "Experience level", status: "positive" as const, detail: "No specific requirement", impact: "+18%" },
    };
  }

  const nums = job.experience_years.match(/(\d+)/g);
  if (!nums) {
    return {
      points: 15,
      item: { label: "Experience level", status: "positive" as const, detail: "Requirement unclear", impact: "+15%" },
    };
  }

  const minReq = parseInt(nums[0]);
  const maxReq = nums[1] ? parseInt(nums[1]) : minReq + 3;

  if (userYears >= minReq && userYears <= maxReq + 2) {
    return {
      points: 25,
      item: { label: "Experience level", status: "positive" as const, detail: `Perfect match (${userYears}yr vs ${job.experience_years})`, impact: "+25%" },
    };
  }
  if (userYears >= minReq - 1) {
    return {
      points: 18,
      item: { label: "Experience level", status: "positive" as const, detail: `Close match (${userYears}yr vs ${job.experience_years})`, impact: "+18%" },
    };
  }
  if (userYears >= minReq - 3) {
    return {
      points: 10,
      item: { label: "Experience level", status: "warning" as const, detail: `Slightly under (${userYears}yr vs ${job.experience_years})`, impact: "+10%" },
    };
  }
  return {
    points: 5,
    item: { label: "Experience level", status: "negative" as const, detail: `Below requirement (${userYears}yr vs ${job.experience_years})`, impact: "+5%" },
  };
}

function getSkillScore(matchResult: JobMatchResult) {
  const matched = matchResult.matchedSkills.length;
  const total = matched + matchResult.missingSkills.length;
  const ratio = total > 0 ? matched / total : 0.5;

  const points = Math.round(ratio * 30);
  const status = ratio >= 0.7 ? "positive" : ratio >= 0.4 ? "warning" : "negative";

  return {
    points,
    item: {
      label: "Core skills",
      status: status as "positive" | "warning" | "negative",
      detail: `${matched}/${total} matched`,
      impact: `+${points}%`,
    },
  };
}

function getMissingSkillScore(matchResult: JobMatchResult) {
  const missing = matchResult.missingSkills;
  if (missing.length === 0) {
    return { points: 0, item: null };
  }

  const penalty = Math.min(missing.length * 3, 15);
  return {
    points: -penalty,
    item: {
      label: `Missing: ${missing.slice(0, 2).join(", ")}`,
      status: "negative" as const,
      detail: `${missing.length} skill${missing.length > 1 ? "s" : ""} not on resume`,
      impact: `-${penalty}%`,
    },
  };
}

function getEducationScore(intelligence: ResumeIntelligence) {
  const edu = intelligence.education;
  if (!edu || !edu.degree) {
    return {
      points: 8,
      item: { label: "Education", status: "warning" as const, detail: "Not specified", impact: "+8%" },
    };
  }

  const degree = edu.degree.toLowerCase();
  if (degree.includes("master") || degree.includes("phd") || degree.includes("doctorate")) {
    return {
      points: 15,
      item: { label: "Education", status: "positive" as const, detail: `${edu.degree} in ${edu.field || "relevant field"}`, impact: "+15%" },
    };
  }
  if (degree.includes("bachelor")) {
    return {
      points: 12,
      item: { label: "Education", status: "positive" as const, detail: `${edu.degree} in ${edu.field || "relevant field"}`, impact: "+12%" },
    };
  }
  return {
    points: 8,
    item: { label: "Education", status: "positive" as const, detail: edu.degree, impact: "+8%" },
  };
}

function getRecencyScore(job: Job) {
  const daysAgo = differenceInDays(new Date(), job.posted_date);

  if (daysAgo <= 1) {
    return {
      points: 10,
      item: { label: "Recently posted", status: "positive" as const, detail: "High urgency — just posted", impact: "+10%" },
    };
  }
  if (daysAgo <= 3) {
    return {
      points: 8,
      item: { label: "Recently posted", status: "positive" as const, detail: `${daysAgo} days ago`, impact: "+8%" },
    };
  }
  if (daysAgo <= 7) {
    return {
      points: 5,
      item: { label: "Post timing", status: "warning" as const, detail: `${daysAgo} days ago`, impact: "+5%" },
    };
  }
  return {
    points: 2,
    item: { label: "Post timing", status: "negative" as const, detail: `${daysAgo} days ago — may be closing`, impact: "+2%" },
  };
}

function getTitleScore(job: Job, intelligence: ResumeIntelligence) {
  const jt = job.title.toLowerCase();
  const pr = intelligence.primaryRole.toLowerCase();
  const targets = (intelligence.jobTitlesToTarget || []).map(t => t.toLowerCase());

  if (jt.includes(pr) || pr.includes(jt)) {
    return {
      points: 10,
      item: { label: "Title match", status: "positive" as const, detail: "Exact role match", impact: "+10%" },
    };
  }
  if (targets.some(t => jt.includes(t) || t.includes(jt))) {
    return {
      points: 7,
      item: { label: "Title match", status: "positive" as const, detail: "Matches target titles", impact: "+7%" },
    };
  }
  return {
    points: 2,
    item: { label: "Title match", status: "warning" as const, detail: "Different from primary role", impact: "+2%" },
  };
}
