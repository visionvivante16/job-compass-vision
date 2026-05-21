import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Job } from "@/types/job";
import { calculateJobMatch, JobMatchResult } from "@/lib/jobMatcher";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { isRoleRelevant } from "@/lib/roleMatching";
import { getResumeVersion } from "@/lib/resumeSync";
import { shouldExcludeJob, isNonEntryLevelJob } from "@/lib/jobFilters";

/**
 * Build title-level filters from user role and target titles.
 * Uses full role/title names only — no word splitting.
 */
/**
 * Build title-level filters strictly from the primary role only.
 * Does NOT use jobTitlesToTarget to avoid pulling in unrelated domains.
 */
function buildTitleFilters(primaryRole: string, currentTitle: string): string[] {
  const titles = new Set<string>();
  for (const t of [primaryRole, currentTitle]) {
    const clean = t?.toLowerCase().trim();
    if (clean && clean.length > 2) titles.add(clean);
  }
  // Also add core word variants (engineer↔developer)
  for (const t of [...titles]) {
    if (t.includes("engineer")) titles.add(t.replace(/engineer/i, "developer"));
    if (t.includes("developer")) titles.add(t.replace(/developer/i, "engineer"));
  }
  return Array.from(titles);
}

export function buildProfileFallbackIntelligence(profile: NonNullable<ReturnType<typeof useProfile>["profile"]>): ResumeIntelligence | null {
  const profileSkills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];
  const profileWork = Array.isArray(profile.work_experience) ? profile.work_experience : [];
  const currentRole = profile.current_title?.trim() || profileWork.find((item) => item?.title?.trim())?.title?.trim() || "";

  if (!currentRole && profileSkills.length === 0) return null;

  const targetTitles = currentRole
    ? [currentRole, ...(currentRole.toLowerCase().includes("engineer") ? [currentRole.replace(/engineer/i, "developer")] : []), ...(currentRole.toLowerCase().includes("developer") ? [currentRole.replace(/developer/i, "engineer")] : [])]
        .map((title) => title.trim())
        .filter(Boolean)
    : [];

  return {
    primaryRole: currentRole || profileSkills.slice(0, 2).join(" / ") || "Candidate",
    primaryStack: profileSkills.slice(0, 8),
    experienceLevel: "mid",
    yearsOfExperience: profile.experience_years ?? undefined,
    topSkills: profileSkills.slice(0, 12),
    secondarySkills: profileSkills.slice(12, 24),
    jobTitlesToTarget: Array.from(new Set(targetTitles)),
    strengthSummary: "Generated from the latest profile data while resume intelligence refreshes.",
  };
}

function parseJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    company_logo: row.company_logo,
    location: row.location,
    description: row.description,
    skills: row.skills || [],
    external_apply_link: row.external_apply_link,
    is_published: row.is_published,
    is_reviewing: row.is_reviewing,
    salary_range: row.salary_range,
    employment_type: row.employment_type || "Full Time",
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    is_archived: row.is_archived,
    description_enriched: row.description_enriched ?? false,
    description_source: row.description_source ?? null,
  };
}

const MIN_MATCH_SCORE = 45;

function freshnessBonus(postedDate: Date): number {
  const hoursAgo = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);
  // Positive bonus for fresh jobs
  if (hoursAgo <= 6) return 12;
  if (hoursAgo <= 24) return 10;
  if (hoursAgo <= 48) return 6;
  if (hoursAgo <= 72) return 3;
  if (hoursAgo <= 168) return 1;
  // Decay penalty for older jobs (7+ days)
  const daysAgo = hoursAgo / 24;
  if (daysAgo >= 10) return -15;
  if (daysAgo >= 8) return -10;
  if (daysAgo >= 10) return -5;
  return 0;
}

function sourceBonus(link: string): number {
  const l = (link || "").toLowerCase();
  if (l.includes("greenhouse.io") || l.includes("greenhouse.com")) return 3;
  if (l.includes("lever.co")) return 2;
  if (l.includes("dice.com") || l.includes("lensa.")) return -3;
  return 0;
}

// Common synonyms within the same role family
const TITLE_SYNONYMS: Record<string, string[]> = {
  "software": ["software", "application", "systems"],
  "engineer": ["engineer", "developer", "programmer"],
  "frontend": ["frontend", "front-end", "front end", "ui"],
  "backend": ["backend", "back-end", "back end", "server"],
  "fullstack": ["fullstack", "full-stack", "full stack"],
  "data": ["data", "analytics", "bi"],
  "analyst": ["analyst", "analytics"],
  "devops": ["devops", "sre", "platform", "infrastructure"],
  "mobile": ["mobile", "ios", "android", "flutter", "react native"],
};

function expandRole(role: string): Set<string> {
  const words = role.toLowerCase().split(/[\s,/\-]+/).filter(w => w.length > 2);
  const expanded = new Set(words);
  for (const w of words) {
    for (const synonyms of Object.values(TITLE_SYNONYMS)) {
      if (synonyms.includes(w)) {
        synonyms.forEach(s => expanded.add(s));
      }
    }
  }
  return expanded;
}

/**
 * Compute title proximity: 3 = exact/near-exact, 2 = close variant/synonym, 1 = same family, 0 = other.
 */
function computeTitleProximity(jobTitle: string, userRole: string, targetTitles: string[]): number {
  const jt = jobTitle.toLowerCase().trim();
  const pr = userRole.toLowerCase().trim();

  // Exact or substring match with primary role
  if (jt === pr || jt.includes(pr) || pr.includes(jt)) return 3;

  // Exact match with any target title
  for (const tt of targetTitles) {
    const ttl = tt.toLowerCase().trim();
    if (jt === ttl || jt.includes(ttl) || ttl.includes(jt)) return 3;
  }

  // Synonym-expanded match: e.g. "Software Developer" ↔ "Software Engineer"
  const userExpanded = expandRole(userRole);
  const jobWords = jt.split(/[\s,/\-]+/).filter(w => w.length > 2);
  if (jobWords.length > 0) {
    const overlap = jobWords.filter(w => userExpanded.has(w)).length;
    if (overlap / jobWords.length >= 0.6) return 2;
  }

  // Target title synonym match
  for (const tt of targetTitles) {
    const ttExpanded = expandRole(tt);
    const overlap = jobWords.filter(w => ttExpanded.has(w)).length;
    if (jobWords.length > 0 && overlap / jobWords.length >= 0.6) return 2;
  }

  // Word-level overlap without synonyms
  const roleWords = pr.split(/[\s,/\-]+/).filter(w => w.length > 2);
  const jobWordSet = new Set(jobWords);
  if (roleWords.length > 0) {
    const overlap = roleWords.filter(w => jobWordSet.has(w)).length;
    if (overlap / roleWords.length >= 0.5) return 1;
  }

  return 0;
}

export interface RecommendedJob extends Job {
  matchScore: number;
  matchedSkills: string[];
  matchResult?: JobMatchResult;
  titleProximity?: number; // 0-3: 3=exact, 2=near-exact, 1=same-family, 0=other
}

export function useRecommendedJobs() {
  const { profile, isLoading: profileLoading } = useProfile();

  const hasResume = !!profile?.resume_url;
  const hasProfileData = !!(profile?.skills?.length || profile?.current_title || (Array.isArray(profile?.work_experience) && profile.work_experience.length));
  const intelligence = profile?.resume_intelligence as ResumeIntelligence | null;
  const hasIntelligence = !!intelligence;

  // Resume version ensures query re-runs after every resume replacement
  const resumeVersion = getResumeVersion(profile);

  // Stable fingerprint of intelligence content
  const intelligenceFingerprint = intelligence
    ? `${intelligence.primaryRole || ""}|${(intelligence.topSkills || []).slice(0, 5).join(",")}|${intelligence.experienceLevel || ""}`
    : null;

  const enabled = !profileLoading && !!profile;

  const query = useQuery({
    queryKey: ["recommended-jobs", resumeVersion, intelligenceFingerprint],
    queryFn: async (): Promise<RecommendedJob[]> => {
      if (!profile) return [];

      const storedIntelligence = profile.resume_intelligence as ResumeIntelligence | null;
      const ri = storedIntelligence ?? buildProfileFallbackIntelligence(profile);

      // Build title-level filters to fetch relevant jobs at the DB level
      const titleFilters = ri ? buildTitleFilters(ri.primaryRole || "", profile.current_title || "") : [];

      let data: any[] | null = null;

      if (titleFilters.length > 0) {
        // Fetch jobs whose title matches any of the user's role/title names
        const titleFilter = titleFilters
          .map(k => `title.ilike.%${k}%`)
          .join(",");

        const { data: filtered, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("is_published", true)
          .eq("is_archived", false)
          .is("deleted_at", null)
          .or(titleFilter)
          .order("posted_date", { ascending: false })
          .limit(500);

        if (error) throw error;
        data = filtered;
      } else {
        // Fallback: no keywords, fetch recent
        const { data: recent, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("is_published", true)
          .eq("is_archived", false)
          .is("deleted_at", null)
          .order("posted_date", { ascending: false })
          .limit(300);

        if (error) throw error;
        data = recent;
      }

      if (!data) return [];

       // No intelligence/profile role → recent jobs fallback
      if (!ri) {
        return data.slice(0, 30).map(row => ({
          ...parseJob(row),
          matchScore: 0,
          matchedSkills: [],
        }));
      }

      const userRole = ri.primaryRole || "";
      const currentTitle = profile.current_title?.trim() || "";
      // Use only primary role + current title variants, NOT broad jobTitlesToTarget
      const strictTitles = Array.from(new Set([userRole, currentTitle].filter(Boolean)));
      const now = Date.now();

      // Determine if user is entry-level based on their profile
      const isEntryLevelUser =
        ri.experienceLevel === "fresher" ||
        ri.experienceLevel === "junior" ||
        (ri.yearsOfExperience !== undefined && ri.yearsOfExperience <= 3);

      const allProcessed: RecommendedJob[] = [];

      for (const row of data) {
        const job = parseJob(row);
        const ageMs = now - job.posted_date.getTime();
        if (ageMs > 5 * 24 * 60 * 60 * 1000) continue; // Show jobs from last 5 days
        if (shouldExcludeJob(job)) continue;
        // For entry-level users, also skip senior/mid-senior roles
        if (isEntryLevelUser && isNonEntryLevelJob(job)) continue;

        const match = calculateJobMatch(job, ri);
        const roleRelevant = isRoleRelevant(job.title, userRole, strictTitles);

        // Domain mismatch penalty: -10 when job is outside user's domain/adjacency
        const domainPenalty = roleRelevant ? 0 : -10;

        const adjustedScore = Math.max(0, Math.min(
          match.score + freshnessBonus(job.posted_date) + sourceBonus(job.external_apply_link) + domainPenalty,
          100
        ));
        const proximity = computeTitleProximity(job.title, userRole, strictTitles);

        allProcessed.push({
          ...job,
          matchScore: adjustedScore,
          matchedSkills: match.matchedSkills,
          matchResult: { ...match, score: adjustedScore },
          titleProximity: proximity,
          _roleRelevant: roleRelevant,
        } as RecommendedJob & { _roleRelevant: boolean });
      }

      // STRICT: Only show role-relevant jobs (same/adjacent domain) AND
      // require at least some title-word overlap so unrelated roles
      // (e.g. "Sales Development Representative" for a Data Engineer) never
      // appear in personalized recommendations, even if their skill score is high.
      const roleRelevantJobs = allProcessed.filter(
        (j) =>
          (j as any)._roleRelevant &&
          (j.titleProximity ?? 0) >= 1 &&
          j.matchScore >= MIN_MATCH_SCORE
      );

      // Combined ranking: match score dominates, title proximity is a strong tiebreaker
      // so an exact-title 60% match still beats a same-family 70% match.
      const rankKey = (j: RecommendedJob) =>
        j.matchScore + (j.titleProximity ?? 0) * 5;

      const sortFn = (a: RecommendedJob, b: RecommendedJob) => {
        const diff = rankKey(b) - rankKey(a);
        if (diff !== 0) return diff;
        const proxDiff = (b.titleProximity ?? 0) - (a.titleProximity ?? 0);
        if (proxDiff !== 0) return proxDiff;
        return b.posted_date.getTime() - a.posted_date.getTime();
      };

      roleRelevantJobs.sort(sortFn);
      let results = roleRelevantJobs.slice(0, 100);

      // Clean internal flag
      return results.map(({ _roleRelevant, ...rest }: any) => rest as RecommendedJob);
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    hasResume,
    hasProfileData,
    canRecommend: hasResume || hasProfileData || hasIntelligence,
  };
}
