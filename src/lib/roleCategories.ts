/**
 * Title-based role categorization for the dashboard feed.
 *
 * Rules:
 * - Matching is purely against the job title (description/skills are NOT used)
 * - Variations like "Senior", "Junior", "Lead", "AWS" before the role still match
 * - A single title can belong to MULTIPLE categories (e.g. "Full Stack Java
 *   Developer" → Full Stack + Java Developer + Software Engineer)
 * - Categories are normalized: "Software Developer" and "Software Engineer"
 *   collapse into a single "Software Engineer" feed
 */

export interface RoleCategory {
  /** Stable id used in URLs / filters */
  id: string;
  /** Display label shown on the pill */
  label: string;
  /** Search term forwarded to the existing search RPC (must match titles in DB) */
  searchTerm: string;
  /** Regex tested against the lowercased title */
  pattern: RegExp;
  /** True for the curated, always-shown set; false for dynamically detected */
  curated: boolean;
}

/**
 * Curated category set — always shown as primary pills.
 * Order here = display order.
 */
export const CURATED_ROLE_CATEGORIES: RoleCategory[] = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    searchTerm: "Software Engineer",
    pattern: /\b(software\s*(engineer|developer)|sde|swe)\b/i,
    curated: true,
  },
  {
    id: "frontend",
    label: "Frontend",
    searchTerm: "Frontend Developer",
    pattern: /\b(front[\s-]?end|ui\s*developer|react\s*developer|angular\s*developer|vue\s*developer)\b/i,
    curated: true,
  },
  {
    id: "backend",
    label: "Backend",
    searchTerm: "Backend Developer",
    pattern: /\b(back[\s-]?end|api\s*developer|server[\s-]?side\s*developer)\b/i,
    curated: true,
  },
  {
    id: "full-stack",
    label: "Full Stack",
    searchTerm: "Full Stack Developer",
    pattern: /\bfull[\s-]?stack\b/i,
    curated: true,
  },
  {
    id: "data-engineer",
    label: "Data Engineer",
    searchTerm: "Data Engineer",
    pattern: /\bdata\s*engineer\b/i,
    curated: true,
  },
  {
    id: "data-analyst",
    label: "Data Analyst",
    searchTerm: "Data Analyst",
    pattern: /\b(data|business|bi|reporting|analytics)\s*analyst\b/i,
    curated: true,
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    searchTerm: "Data Scientist",
    pattern: /\bdata\s*scientist\b/i,
    curated: true,
  },
  {
    id: "ai-ml",
    label: "AI / ML",
    searchTerm: "AI Engineer",
    // Matches: "AI" as a standalone word (AI Engineer, Applied AI, Generative AI, etc.),
    // "Artificial Intelligence", ML/Machine Learning, Deep Learning, NLP, Computer Vision,
    // GenAI, LLM Engineer. Uses \b boundaries so "ai" inside words like "main", "chair",
    // "captain" never matches.
    pattern: /\b(ai|a\.i\.|artificial\s*intelligence|ml\s*engineer|machine\s*learning|deep\s*learning|nlp\s*engineer|computer\s*vision\s*engineer|gen\s*ai|genai|llm\s*engineer)\b/i,
    curated: true,
  },
  {
    id: "devops",
    label: "DevOps / Cloud",
    searchTerm: "DevOps Engineer",
    pattern: /\b(devops|sre|site\s*reliability|platform\s*engineer|cloud\s*engineer|aws\s*engineer|azure\s*engineer|gcp\s*engineer|kubernetes\s*engineer|infrastructure\s*engineer)\b/i,
    curated: true,
  },
  {
    id: "mobile",
    label: "Mobile",
    searchTerm: "Mobile Developer",
    pattern: /\b(mobile\s*(developer|engineer)|ios\s*(developer|engineer)|android\s*(developer|engineer)|react\s*native|flutter\s*(developer|engineer))\b/i,
    curated: true,
  },
  {
    id: "qa",
    label: "QA / Test",
    searchTerm: "QA Engineer",
    pattern: /\b(qa\s*(engineer|analyst|lead)|quality\s*assurance|test\s*(engineer|automation|lead)|sdet|automation\s*engineer)\b/i,
    curated: true,
  },
  {
    id: "security",
    label: "Security",
    searchTerm: "Security Engineer",
    pattern: /\b(security\s*(engineer|analyst|architect)|cyber\s*security|infosec|penetration\s*test|appsec)\b/i,
    curated: true,
  },
  {
    id: "java-developer",
    label: "Java Developer",
    searchTerm: "Java Developer",
    pattern: /\bjava\s*(developer|engineer)\b/i,
    curated: true,
  },
  {
    id: "python-developer",
    label: "Python Developer",
    searchTerm: "Python Developer",
    pattern: /\bpython\s*(developer|engineer)\b/i,
    curated: true,
  },
];

/**
 * Dynamic-only categories — only surface in the "Other roles" dropdown if at
 * least one job in the current page matches.
 */
export const DYNAMIC_ROLE_CATEGORIES: RoleCategory[] = [
  {
    id: "salesforce-developer",
    label: "Salesforce Developer",
    searchTerm: "Salesforce Developer",
    pattern: /\bsalesforce\s*(developer|engineer|admin)\b/i,
    curated: false,
  },
  {
    id: "ruby-developer",
    label: "Ruby Developer",
    searchTerm: "Ruby Developer",
    pattern: /\bruby(\s*on\s*rails)?\s*(developer|engineer)\b/i,
    curated: false,
  },
  {
    id: "golang-developer",
    label: "Go / Golang Developer",
    searchTerm: "Golang Developer",
    pattern: /\b(go|golang)\s*(developer|engineer)\b/i,
    curated: false,
  },
  {
    id: "rust-developer",
    label: "Rust Developer",
    searchTerm: "Rust Developer",
    pattern: /\brust\s*(developer|engineer)\b/i,
    curated: false,
  },
  {
    id: "dotnet-developer",
    label: ".NET Developer",
    searchTerm: ".NET Developer",
    pattern: /\b(\.net|dotnet|c#)\s*(developer|engineer)\b/i,
    curated: false,
  },
  {
    id: "php-developer",
    label: "PHP Developer",
    searchTerm: "PHP Developer",
    pattern: /\bphp\s*(developer|engineer)\b/i,
    curated: false,
  },
  {
    id: "node-developer",
    label: "Node.js Developer",
    searchTerm: "Node.js Developer",
    pattern: /\bnode(\.js|js)?\s*(developer|engineer)\b/i,
    curated: false,
  },
  {
    id: "sap-developer",
    label: "SAP Developer",
    searchTerm: "SAP Developer",
    pattern: /\bsap\s*(developer|consultant|engineer)\b/i,
    curated: false,
  },
  {
    id: "ux-designer",
    label: "UX / UI Designer",
    searchTerm: "UX Designer",
    pattern: /\b(ux|ui|product)\s*(designer|design)\b/i,
    curated: false,
  },
  {
    id: "product-manager",
    label: "Product Manager",
    searchTerm: "Product Manager",
    pattern: /\b(product\s*manager|product\s*owner)\b/i,
    curated: false,
  },
  {
    id: "project-manager",
    label: "Project Manager",
    searchTerm: "Project Manager",
    pattern: /\b(project\s*manager|program\s*manager|scrum\s*master)\b/i,
    curated: false,
  },
  {
    id: "database-admin",
    label: "Database Admin",
    searchTerm: "Database Administrator",
    pattern: /\b(database\s*(admin|administrator|engineer)|dba)\b/i,
    curated: false,
  },
  {
    id: "network-engineer",
    label: "Network Engineer",
    searchTerm: "Network Engineer",
    pattern: /\b(network\s*(engineer|administrator)|systems?\s*admin)\b/i,
    curated: false,
  },
  {
    id: "embedded",
    label: "Embedded Engineer",
    searchTerm: "Embedded Engineer",
    pattern: /\b(embedded|firmware)\s*(engineer|developer)\b/i,
    curated: false,
  },
  {
    id: "game-developer",
    label: "Game Developer",
    searchTerm: "Game Developer",
    pattern: /\b(game|unity|unreal)\s*(developer|engineer)\b/i,
    curated: false,
  },
];

const ALL_CATEGORIES: RoleCategory[] = [
  ...CURATED_ROLE_CATEGORIES,
  ...DYNAMIC_ROLE_CATEGORIES,
];

/**
 * Returns ALL categories whose pattern matches the given title.
 * A title like "Full Stack Java Developer" returns:
 *   ["full-stack", "java-developer", "software-engineer" (no — no SE keyword)]
 */
export function getCategoriesForTitle(title: string): string[] {
  if (!title) return [];
  const ids: string[] = [];
  for (const cat of ALL_CATEGORIES) {
    if (cat.pattern.test(title)) {
      ids.push(cat.id);
    }
  }
  return ids;
}

export function getCategoryById(id: string): RoleCategory | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}

/**
 * Test whether a job title belongs to a given category id.
 * Used as a final client-side guard so the search RPC can't leak titles that
 * happen to match the search term in company/skills but not in the title.
 */
export function titleMatchesCategory(title: string, categoryId: string): boolean {
  const cat = getCategoryById(categoryId);
  if (!cat) return false;
  return cat.pattern.test(title || "");
}
