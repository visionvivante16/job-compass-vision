/**
 * Role-family search expansion.
 * Returns closely related role titles so the search engine can show
 * exact matches first, then related roles from the same domain/family.
 *
 * Two tiers:
 *   - close:  direct synonyms / seniority variants (shown right after exact)
 *   - broad:  same-family but different sub-specialty
 */

// ── Role-family definitions ──────────────────────────────────────────
// Each family lists roles from most common → least common.
// The search term is matched against every entry; all *other* entries
// in the same family become expansion candidates.

const ROLE_FAMILIES: { keywords: string[]; close: string[]; broad: string[] }[] = [
  // ── Software / Development ─────────────────────────────────────
  {
    keywords: [
      "software developer", "software engineer", "sde", "swe",
      "application developer", "web developer", "programmer",
    ],
    close: [
      "software developer", "software engineer", "senior software engineer",
      "junior software developer", "web developer", "application developer",
      "full stack developer", "full stack engineer",
    ],
    broad: [
      "frontend developer", "frontend engineer", "backend developer",
      "backend engineer", "react developer", "node developer",
      "java developer", "python developer", ".net developer",
      "golang developer", "rust developer", "c++ developer",
      "cloud developer", "systems developer",
    ],
  },
  {
    keywords: ["frontend developer", "frontend engineer", "front end developer", "front-end developer", "react developer"],
    close: [
      "frontend developer", "frontend engineer", "senior frontend developer",
      "react developer", "front end developer", "ui developer",
    ],
    broad: [
      "software developer", "software engineer", "full stack developer",
      "web developer", "javascript developer", "angular developer",
      "vue developer",
    ],
  },
  {
    keywords: ["backend developer", "backend engineer", "back end developer", "back-end developer", "server side"],
    close: [
      "backend developer", "backend engineer", "senior backend developer",
      "api developer", "server side developer",
    ],
    broad: [
      "software developer", "software engineer", "full stack developer",
      "java developer", "python developer", "node developer",
      ".net developer", "golang developer", "cloud developer",
    ],
  },
  {
    keywords: ["full stack developer", "full stack engineer", "fullstack developer", "fullstack engineer"],
    close: [
      "full stack developer", "full stack engineer", "senior full stack developer",
      "fullstack developer",
    ],
    broad: [
      "software developer", "software engineer", "frontend developer",
      "backend developer", "web developer", "react developer",
      "node developer",
    ],
  },

  // ── Data / Analytics ───────────────────────────────────────────
  {
    keywords: ["data analyst", "business analyst", "bi analyst", "reporting analyst", "analytics"],
    close: [
      "data analyst", "senior data analyst", "junior data analyst",
      "business analyst", "bi analyst", "reporting analyst",
      "business intelligence analyst",
    ],
    broad: [
      "analytics engineer", "data engineer", "data scientist",
      "quantitative analyst", "insights analyst", "research analyst",
    ],
  },
  {
    keywords: ["data engineer", "etl", "data platform", "data infrastructure"],
    close: [
      "data engineer", "senior data engineer", "etl developer",
      "data platform engineer", "data infrastructure engineer",
    ],
    broad: [
      "data analyst", "analytics engineer", "data scientist",
      "software engineer", "cloud engineer", "database administrator",
    ],
  },
  {
    keywords: [
      "data scientist", "machine learning", "ml engineer", "ai engineer",
      "deep learning", "nlp", "computer vision",
    ],
    close: [
      "data scientist", "senior data scientist", "machine learning engineer",
      "ml engineer", "ai engineer", "applied scientist",
    ],
    broad: [
      "nlp engineer", "computer vision engineer", "deep learning engineer",
      "research scientist", "data engineer", "data analyst",
      "analytics engineer", "platform engineer",
    ],
  },

  // ── DevOps / Cloud / Platform ──────────────────────────────────
  {
    keywords: [
      "devops", "devops engineer", "sre", "site reliability",
      "platform engineer", "infrastructure engineer",
      "cloud engineer", "aws engineer", "azure engineer", "gcp engineer",
    ],
    close: [
      "devops engineer", "senior devops engineer", "sre",
      "site reliability engineer", "platform engineer",
      "infrastructure engineer", "cloud engineer",
    ],
    broad: [
      "aws engineer", "azure engineer", "gcp engineer",
      "kubernetes engineer", "systems engineer", "linux engineer",
      "network engineer", "release engineer", "build engineer",
      "software engineer",
    ],
  },

  // ── QA / Testing ───────────────────────────────────────────────
  {
    keywords: ["qa", "qa engineer", "tester", "test engineer", "sdet", "quality assurance", "automation engineer"],
    close: [
      "qa engineer", "senior qa engineer", "test engineer",
      "sdet", "quality assurance engineer", "automation engineer",
    ],
    broad: [
      "test automation engineer", "performance tester",
      "qa analyst", "qa lead", "software engineer in test",
      "manual tester",
    ],
  },

  // ── Security ───────────────────────────────────────────────────
  {
    keywords: ["security engineer", "cyber security", "infosec", "penetration tester", "appsec"],
    close: [
      "security engineer", "senior security engineer",
      "cyber security analyst", "information security engineer",
      "application security engineer",
    ],
    broad: [
      "penetration tester", "security architect", "soc analyst",
      "security analyst", "network security engineer",
      "cloud security engineer", "devops engineer",
    ],
  },

  // ── Mobile ─────────────────────────────────────────────────────
  {
    keywords: [
      "mobile developer", "mobile engineer", "ios developer", "ios engineer",
      "android developer", "android engineer", "react native", "flutter",
    ],
    close: [
      "mobile developer", "mobile engineer", "senior mobile developer",
      "ios developer", "android developer",
    ],
    broad: [
      "react native developer", "flutter developer", "swift developer",
      "kotlin developer", "cross-platform developer",
      "software developer", "frontend developer",
    ],
  },

  // ── UI/UX / Design ─────────────────────────────────────────────
  {
    keywords: [
      "ui designer", "ux designer", "product designer", "ui/ux",
      "interaction designer", "visual designer", "graphic designer",
    ],
    close: [
      "ui designer", "ux designer", "product designer",
      "ui/ux designer", "senior product designer",
    ],
    broad: [
      "interaction designer", "visual designer", "graphic designer",
      "ux researcher", "design lead", "creative director",
    ],
  },

  // ── Product / Project Management ───────────────────────────────
  {
    keywords: [
      "product manager", "pm", "product owner",
      "program manager", "technical program manager",
    ],
    close: [
      "product manager", "senior product manager",
      "product owner", "technical product manager",
    ],
    broad: [
      "program manager", "technical program manager",
      "project manager", "scrum master", "agile coach",
      "business analyst",
    ],
  },
  {
    keywords: ["project manager", "project coordinator", "project lead", "pmp"],
    close: [
      "project manager", "senior project manager",
      "project coordinator", "project lead",
    ],
    broad: [
      "program manager", "product manager", "scrum master",
      "operations manager", "delivery manager",
    ],
  },

  // ── Marketing ──────────────────────────────────────────────────
  {
    keywords: [
      "marketing", "marketing manager", "growth", "seo",
      "content manager", "content strategist", "digital marketing",
      "brand manager", "social media",
    ],
    close: [
      "marketing manager", "senior marketing manager",
      "digital marketing manager", "growth manager",
    ],
    broad: [
      "seo specialist", "content strategist", "content manager",
      "brand manager", "social media manager", "performance marketer",
      "marketing analyst", "growth hacker",
    ],
  },

  // ── Sales / BizDev ─────────────────────────────────────────────
  {
    keywords: [
      "sales", "account executive", "business development",
      "bdr", "sdr", "sales manager",
    ],
    close: [
      "account executive", "senior account executive",
      "sales representative", "sales manager",
    ],
    broad: [
      "business development representative", "bdr", "sdr",
      "sales engineer", "enterprise sales", "inside sales",
      "account manager", "customer success manager",
    ],
  },

  // ── Customer Support / Success ─────────────────────────────────
  {
    keywords: [
      "customer success", "customer support", "customer service",
      "help desk", "technical support", "cx",
    ],
    close: [
      "customer success manager", "customer support specialist",
      "customer service representative", "technical support engineer",
    ],
    broad: [
      "help desk technician", "support engineer",
      "account manager", "customer experience manager",
    ],
  },

  // ── HR / Recruiting ────────────────────────────────────────────
  {
    keywords: [
      "recruiter", "talent acquisition", "hr", "human resources",
      "people ops", "hr manager", "hr generalist", "hr business partner",
    ],
    close: [
      "recruiter", "senior recruiter", "talent acquisition specialist",
      "hr manager", "hr generalist",
    ],
    broad: [
      "hr business partner", "people operations manager",
      "talent partner", "sourcer", "compensation analyst",
    ],
  },

  // ── Finance / Accounting ───────────────────────────────────────
  {
    keywords: [
      "finance", "financial analyst", "accountant", "accounting",
      "controller", "treasury", "audit",
    ],
    close: [
      "financial analyst", "senior financial analyst",
      "accountant", "senior accountant",
    ],
    broad: [
      "fp&a analyst", "controller", "auditor",
      "treasury analyst", "tax analyst", "finance manager",
    ],
  },

  // ── Operations / Supply Chain ──────────────────────────────────
  {
    keywords: [
      "operations manager", "operations analyst",
      "supply chain", "logistics", "procurement",
    ],
    close: [
      "operations manager", "senior operations manager",
      "operations analyst",
    ],
    broad: [
      "supply chain manager", "logistics manager",
      "procurement manager", "warehouse manager",
      "business operations", "delivery manager",
    ],
  },

  // ── Consulting ─────────────────────────────────────────────────
  {
    keywords: [
      "consultant", "management consultant", "strategy consultant",
      "business consultant",
    ],
    close: [
      "management consultant", "senior consultant",
      "strategy consultant", "associate consultant",
    ],
    broad: [
      "business consultant", "technology consultant",
      "solutions consultant", "advisory",
    ],
  },

  // ── Database / DBA ─────────────────────────────────────────────
  {
    keywords: ["dba", "database administrator", "database engineer"],
    close: [
      "database administrator", "senior dba",
      "database engineer",
    ],
    broad: [
      "data engineer", "sql developer", "systems administrator",
      "backend developer",
    ],
  },

  // ── Engineering Management ─────────────────────────────────────
  {
    keywords: ["engineering manager", "technical lead", "tech lead", "vp engineering", "director of engineering"],
    close: [
      "engineering manager", "senior engineering manager",
      "technical lead", "tech lead",
    ],
    broad: [
      "director of engineering", "vp engineering",
      "principal engineer", "staff engineer",
      "software engineer", "architect",
    ],
  },

  // ── Solutions Architect ────────────────────────────────────────
  {
    keywords: ["solutions architect", "enterprise architect", "technical architect", "cloud architect"],
    close: [
      "solutions architect", "senior solutions architect",
      "technical architect", "enterprise architect",
    ],
    broad: [
      "cloud architect", "software architect",
      "infrastructure architect", "principal engineer",
      "staff engineer",
    ],
  },
];

// Build a lookup: normalized keyword → family index
const keywordToFamilies = new Map<string, number[]>();
for (let i = 0; i < ROLE_FAMILIES.length; i++) {
  for (const kw of ROLE_FAMILIES[i].keywords) {
    const norm = kw.toLowerCase().trim();
    const existing = keywordToFamilies.get(norm) || [];
    existing.push(i);
    keywordToFamilies.set(norm, existing);
  }
}

/**
 * Returns expanded search terms for a query, ordered by relevance:
 *   close synonyms first, then broader related roles.
 */
export function expandSearchTerms(query: string): string[] {
  if (!query || !query.trim()) return [];

  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/[\s,/\-_]+/).filter(w => w.length > 1);
  const expanded = new Set<string>();
  const broadSet = new Set<string>();

  // Try full query as phrase
  const matchedFamilies = new Set<number>();

  const phraseMatches = keywordToFamilies.get(normalized);
  if (phraseMatches) {
    phraseMatches.forEach(idx => matchedFamilies.add(idx));
  }

  // Try individual words
  for (const word of words) {
    const wm = keywordToFamilies.get(word);
    if (wm) wm.forEach(idx => matchedFamilies.add(idx));
  }

  // Try 2-word combinations for multi-word matches
  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`;
    const pm = keywordToFamilies.get(pair);
    if (pm) pm.forEach(idx => matchedFamilies.add(idx));
  }

  // Only collect CLOSE variants that share substring overlap with the query.
  // This keeps "Senior Data Engineer" / "Data Platform Engineer" for a "data engineer" search,
  // but drops unrelated family members like "BI Analyst" that would pollute results.
  Array.from(matchedFamilies).forEach(idx => {
    const family = ROLE_FAMILIES[idx];
    for (const term of family.close) {
      const t = term.toLowerCase();
      if (t === normalized || words.includes(t)) continue;
      // Require true substring overlap: term contains the query, or query contains the term
      const overlaps = t.includes(normalized) || normalized.includes(t);
      if (overlaps) expanded.add(t);
    }
  });

  // Broad expansion intentionally disabled — caused unrelated results (e.g. "BI Analyst" for "Data Engineer").
  return Array.from(expanded).filter(t => t.length > 1).slice(0, 10);
}
