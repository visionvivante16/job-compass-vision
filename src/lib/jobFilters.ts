import { Job } from "@/types/job";

// ── Tutor / Teaching keywords ──────────────────────────────────────
const EXCLUDED_TITLE_KEYWORDS = [
  'tutor', 'tutoring', 'teacher', 'teaching assistant',
  'instructor', 'lecturer', 'trainer', 'academic coach',
  'private lesson', 'teaching',
  'supervisor', 'cleaning', 'janitor', 'janitorial', 'custodian', 'housekeeper', 'housekeeping',
  'technician', 'helper',
];

// ── High-experience title patterns ─────────────────────────────────
const HIGH_EXP_TITLE_PATTERNS = [
  /\bstaff\s+(engineer|developer|designer|scientist)/i,
  /\bprincipal\s+(engineer|developer|designer|scientist|architect)/i,
  /\bdirector\b/i,
  /\bvp\b/i,
  /\bvice\s+president\b/i,
  /\bchief\b/i,
  /\b(cto|cfo|coo|ceo)\b/i,
  /\bfellow\b/i,
  /\bdistinguished\s+(engineer|scientist)/i,
];

// ── Experience year patterns in text ──────────────────────────────
const HIGH_EXP_TEXT_PATTERNS = [
  /\b([6-9]|[1-9]\d)\+?\s*[-–]?\s*(?:\d+\s*)?(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp\.?)?/i,
  /(?:minimum|at\s+least|requires?)\s*(?:of\s+)?([6-9]|[1-9]\d)\s*(?:years?|yrs?)/i,
  /(?:experience|exp\.?)\s*(?:required)?[\s:]+([6-9]|[1-9]\d)\+?\s*(?:years?|yrs?)/i,
];

// ── Entry-level intent keywords ────────────────────────────────────
const ENTRY_LEVEL_KEYWORDS = [
  'entry level', 'entry-level', 'entrylevel',
  'fresher', 'freshers', 'fresh graduate',
  'new grad', 'new graduate', 'recent graduate', 'recent grad',
  'beginner', 'junior level', 'junior-level',
  '0-1 years', '0-2 years', '0-3 years', '0-5 years',
  '0 to 1 year', '0 to 2 years', '0 to 3 years', '0 to 5 years',
  'no experience', 'no experience required',
  'graduate', 'campus hire',
];

// ── Senior-level title patterns (stricter, for entry-level filtering) ──
const SENIOR_TITLE_PATTERNS = [
  /\bsenior\b/i,
  /\bsr\.?\s/i,
  /\blead\s+(engineer|developer|designer|scientist|analyst)/i,
  /\bmanager\b/i,
  /\bhead\s+of\b/i,
  /\barchitect\b/i,
  ...HIGH_EXP_TITLE_PATTERNS,
];

// ── Experience >3 years patterns (stricter threshold for entry-level) ──
const ENTRY_LEVEL_EXP_CEILING = 3; // Jobs requiring >3 years are excluded in entry-level mode

const MID_EXP_TEXT_PATTERNS = [
  /\b([4-9]|[1-9]\d)\+?\s*[-–]?\s*(?:\d+\s*)?(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp\.?)?/i,
  /(?:minimum|at\s+least|requires?)\s*(?:of\s+)?([4-9]|[1-9]\d)\s*(?:years?|yrs?)/i,
];

/** Returns true if the job is a tutor/teaching listing */
export function isTutorListing(job: Pick<Job, 'title' | 'description'>): boolean {
  const t = job.title.toLowerCase();
  return EXCLUDED_TITLE_KEYWORDS.some(kw => t.includes(kw));
}

/** Parse numeric years from experience_years field */
function parseExpYears(exp: string | null | undefined): number | null {
  if (!exp) return null;
  const nums = exp.match(/\d+/g);
  if (!nums?.length) return null;
  return Math.max(...nums.map(Number));
}

/** Returns true if the job clearly requires >5 years experience */
export function isHighExperienceJob(job: Pick<Job, 'title' | 'description' | 'experience_years'>): boolean {
  const expNum = parseExpYears(job.experience_years);
  if (expNum !== null && expNum > 5) return true;
  if (HIGH_EXP_TITLE_PATTERNS.some(p => p.test(job.title))) return true;
  if (job.description) {
    for (const pattern of HIGH_EXP_TEXT_PATTERNS) {
      const match = job.description.match(pattern);
      if (match) {
        const numMatch = match[0].match(/\d+/);
        if (numMatch && parseInt(numMatch[0], 10) > 5) return true;
      }
    }
  }
  return false;
}

/** Returns true if the title indicates a senior-level role */
export function isSeniorTitle(title: string): boolean {
  return /\b(senior|sr\.?|lead|principal|staff|director|head\s+of|vp|vice\s+president|chief|cto|cfo|coo|ceo|architect|fellow|distinguished)\b/i.test(title);
}

/** Returns true if the job should be excluded from the platform */
export function shouldExcludeJob(job: Pick<Job, 'title' | 'description' | 'experience_years'>): boolean {
  if (isTutorListing(job)) return true;
  // Always allow jobs that explicitly require <6 years of experience
  const expNum = parseExpYears(job.experience_years);
  if (expNum !== null && expNum <= 5) return false;
  return isHighExperienceJob(job) || isSeniorTitle(job.title);
}

/** Filter an array of jobs, removing unwanted ones */
export function filterExcludedJobs<T extends Pick<Job, 'title' | 'description' | 'experience_years'>>(jobs: T[]): T[] {
  return jobs.filter(job => !shouldExcludeJob(job));
}

// ── Entry-level intent detection ───────────────────────────────────

/** Detect if a search query has entry-level intent */
export function hasEntryLevelIntent(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase().trim();
  return ENTRY_LEVEL_KEYWORDS.some(kw => q.includes(kw));
}

/** Strip entry-level keywords from query to get the role-specific part */
export function stripEntryLevelKeywords(query: string): string {
  if (!query) return '';
  let q = query.toLowerCase().trim();
  // Sort longest first to avoid partial replacements
  const sorted = [...ENTRY_LEVEL_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    q = q.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  // Clean up common filler words left over
  q = q.replace(/\b(jobs?|roles?|positions?|openings?|opportunities?|for)\b/gi, ' ');
  return q.replace(/\s+/g, ' ').trim();
}

/**
 * Returns true if a job is NOT suitable for entry-level candidates.
 * Stricter than `isHighExperienceJob` — also excludes Senior titles and >3yr requirements.
 */
export function isNonEntryLevelJob(job: Pick<Job, 'title' | 'description' | 'experience_years'>): boolean {
  // Check title for senior/lead/manager/architect patterns
  if (SENIOR_TITLE_PATTERNS.some(p => p.test(job.title))) return true;

  // Check experience_years field
  const expNum = parseExpYears(job.experience_years);
  if (expNum !== null && expNum > ENTRY_LEVEL_EXP_CEILING) return true;

  // Check description for mid-high experience requirements
  if (job.description) {
    for (const pattern of MID_EXP_TEXT_PATTERNS) {
      const match = job.description.match(pattern);
      if (match) {
        const numMatch = match[0].match(/\d+/);
        if (numMatch && parseInt(numMatch[0], 10) > ENTRY_LEVEL_EXP_CEILING) return true;
      }
    }
  }

  return false;
}

/** Filter jobs to only entry-level suitable ones */
export function filterEntryLevelOnly<T extends Pick<Job, 'title' | 'description' | 'experience_years'>>(jobs: T[]): T[] {
  return jobs.filter(job => !shouldExcludeJob(job) && !isNonEntryLevelJob(job));
}
