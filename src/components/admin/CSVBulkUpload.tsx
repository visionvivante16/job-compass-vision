import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRemoveDuplicates } from "@/hooks/useRemoveDuplicates";
import { isHighExperienceJob } from "@/lib/jobFilters";



interface CSVJob {
  title: string;
  company: string;
  location: string;
  description: string;
  external_apply_link: string;
  skills?: string;
  employment_type?: string;
  experience_years?: string;
  salary_range?: string;
  company_logo?: string;
  posted_date?: string;
}

interface ParseResult {
  valid: CSVJob[];
  errors: { row: number; message: string }[];
}

interface UploadSummary {
  totalRows: number;
  inserted: number;
  skippedDuplicates: number;
  oldDuplicatesRemoved: number;
}

// Critical fields: row is rejected only if these are missing.
// Other fields (company, location, description) get sensible defaults.
const CRITICAL_FIELDS = ["title", "external_apply_link"];
// Required for header mapping (so we know which columns to look for) — but rows missing the non-critical ones are still allowed.
const REQUIRED_FIELDS = ["title", "company", "location", "description", "external_apply_link"];

// Smart header mapping: maps common CSV column name variations to our internal field names
const HEADER_ALIASES: Record<string, string> = {
  // title
  'title': 'title', 'job title': 'title', 'jobtitle': 'title', 'role': 'title',
  'position': 'title', 'job name': 'title', 'jobname': 'title', 'role title': 'title',
  'position title': 'title', 'job role': 'title', 'designation': 'title',
  // company
  'company': 'company', 'company name': 'company', 'companyname': 'company',
  'employer': 'company', 'employer name': 'company', 'organization': 'company', 'org': 'company',
  'firm': 'company', 'hiring company': 'company',
  // location
  'location': 'location', 'job location': 'location', 'joblocation': 'location',
  'city': 'location', 'work location': 'location', 'office location': 'location',
  'place': 'location', 'region': 'location',
  // description
  'description': 'description', 'job description': 'description', 'jobdescription': 'description',
  'full job description': 'description', 'full description': 'description', 'desc': 'description',
  'details': 'description', 'job details': 'description', 'summary': 'description',
  'job summary': 'description', 'about the role': 'description',
  // external_apply_link
  'external_apply_link': 'external_apply_link', 'externalapplylink': 'external_apply_link',
  'external apply link': 'external_apply_link', 'apply link': 'external_apply_link',
  'applylink': 'external_apply_link', 'apply url': 'external_apply_link',
  'applyurl': 'external_apply_link', 'application url': 'external_apply_link',
  'applicationurl': 'external_apply_link', 'application link': 'external_apply_link',
  'url': 'external_apply_link', 'link': 'external_apply_link', 'job url': 'external_apply_link',
  'joburl': 'external_apply_link', 'job link': 'external_apply_link', 'joblink': 'external_apply_link',
  'apply': 'external_apply_link', 'direct company apply url': 'external_apply_link',
  'company url': 'external_apply_link', 'posting url': 'external_apply_link',
  // skills (optional)
  'skills': 'skills', 'required skills': 'skills', 'tech stack': 'skills',
  'techstack': 'skills', 'technologies': 'skills', 'tools': 'skills',
  'key skills': 'skills', 'technical skills': 'skills', 'qualifications': 'skills',
  // employment_type (optional)
  'employment_type': 'employment_type', 'employmenttype': 'employment_type',
  'employment type': 'employment_type', 'job type': 'employment_type',
  'jobtype': 'employment_type', 'type': 'employment_type', 'work type': 'employment_type',
  // experience_years (optional)
  'experience_years': 'experience_years', 'experienceyears': 'experience_years',
  'experience years': 'experience_years', 'experience': 'experience_years',
  'years of experience': 'experience_years', 'yoe': 'experience_years',
  // salary_range (optional)
  'salary_range': 'salary_range', 'salaryrange': 'salary_range',
  'salary range': 'salary_range', 'salary': 'salary_range', 'pay': 'salary_range',
  'compensation': 'salary_range', 'pay range': 'salary_range',
  // company_logo (optional)
  'company_logo': 'company_logo', 'companylogo': 'company_logo',
  'company logo': 'company_logo', 'logo': 'company_logo', 'logo url': 'company_logo',
  'company logo url': 'company_logo', 'company_logo_url': 'company_logo',
  'logo_url': 'company_logo', 'logourl': 'company_logo', 'image': 'company_logo',
  'company image': 'company_logo', 'company image url': 'company_logo',
  // posted_date (optional)
  'posted_date': 'posted_date', 'posteddate': 'posted_date',
  'posted date': 'posted_date', 'date posted': 'posted_date', 'date': 'posted_date',
  'publish date': 'posted_date', 'post date': 'posted_date',
};

function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[_\-\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapHeaders(rawHeaders: string[]): { mapped: string[]; unmapped: string[] } {
  const mapped = rawHeaders.map((h) => {
    const norm = normalizeHeader(h);
    return HEADER_ALIASES[norm] || norm;
  });
  // Only critical columns (title + external_apply_link) are required to exist as headers.
  const unmapped = CRITICAL_FIELDS.filter((f) => !mapped.includes(f));
  return { mapped, unmapped };
}

const DICE_PATTERNS = [
  'dice.com',
  'www.dice.com',
  'employer.dice.com',
];

function isDiceLink(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DICE_PATTERNS.some(p => hostname === p || hostname.endsWith('.' + p));
  } catch {
    return url.toLowerCase().includes('dice.com');
  }
}

// LinkedIn/ATS hosts block hotlinking, so substitute a Google favicon
// derived from the apply-link domain (or company slug) instead.
const BLOCKED_LOGO_HOSTS = [
  'licdn.com', 'media.licdn.com', 'static.licdn.com', 'linkedin.com',
  'greenhouse', 'lever.co', 'workday', 'icims', 'taleo',
  'smartrecruiters', 'jobvite',
];

function isBlockedLogoUrl(url: string): boolean {
  const l = url.toLowerCase();
  return BLOCKED_LOGO_HOSTS.some((h) => l.includes(h));
}

function googleFaviconFor(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function resolveLogo(
  rawLogo: string | undefined,
  applyLink: string | undefined,
  company: string | undefined,
): string | null {
  // Use a valid, non-blocked logo as-is
  if (rawLogo && /^https?:\/\/.+\..+/i.test(rawLogo) && !isBlockedLogoUrl(rawLogo)) {
    return rawLogo;
  }
  // Otherwise derive a favicon from the apply link domain
  if (applyLink) {
    try {
      const host = new URL(applyLink).hostname.replace(/^www\./, '');
      // Skip generic ATS/job-board hosts — favicon would be ATS, not the company
      const generic = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
        'monster.com', 'dice.com', 'greenhouse.io', 'lever.co', 'workday.com',
        'icims.com', 'smartrecruiters.com', 'jobvite.com', 'myworkdayjobs.com'];
      if (!generic.some((g) => host.endsWith(g))) {
        return googleFaviconFor(host);
      }
    } catch { /* fall through */ }
  }
  // Last resort: try company slug as domain
  if (company) {
    const slug = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (slug.length >= 3) return googleFaviconFor(`${slug}.com`);
  }
  return null;
}

const COMMON_SKILLS: Record<string, string> = {
  'js': 'JavaScript', 'javascript': 'JavaScript', 'typescript': 'TypeScript', 'ts': 'TypeScript',
  'react': 'React', 'reactjs': 'React', 'react.js': 'React', 'react js': 'React',
  'angular': 'Angular', 'angularjs': 'Angular', 'vue': 'Vue.js', 'vuejs': 'Vue.js',
  'node': 'Node.js', 'nodejs': 'Node.js', 'node.js': 'Node.js',
  'python': 'Python', 'java': 'Java', 'c#': 'C#', 'csharp': 'C#', 'c++': 'C++', 'cpp': 'C++',
  'go': 'Go', 'golang': 'Go', 'rust': 'Rust', 'ruby': 'Ruby', 'php': 'PHP', 'swift': 'Swift',
  'kotlin': 'Kotlin', 'scala': 'Scala', 'r': 'R', 'perl': 'Perl',
  'html': 'HTML', 'html5': 'HTML', 'css': 'CSS', 'css3': 'CSS', 'sass': 'Sass', 'scss': 'Sass',
  'sql': 'SQL', 'mysql': 'MySQL', 'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL',
  'mongodb': 'MongoDB', 'mongo': 'MongoDB', 'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
  'dynamodb': 'DynamoDB', 'cassandra': 'Cassandra', 'oracle': 'Oracle',
  'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP', 'google cloud': 'GCP',
  'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
  'terraform': 'Terraform', 'ansible': 'Ansible', 'jenkins': 'Jenkins',
  'git': 'Git', 'github': 'GitHub', 'gitlab': 'GitLab', 'ci/cd': 'CI/CD', 'cicd': 'CI/CD',
  'rest': 'REST APIs', 'restful': 'REST APIs', 'graphql': 'GraphQL', 'grpc': 'gRPC',
  'kafka': 'Kafka', 'rabbitmq': 'RabbitMQ',
  'linux': 'Linux', 'unix': 'Unix', 'bash': 'Bash',
  'agile': 'Agile', 'scrum': 'Scrum', 'jira': 'Jira',
  'figma': 'Figma', 'sketch': 'Sketch',
  'machine learning': 'Machine Learning', 'ml': 'Machine Learning',
  'deep learning': 'Deep Learning', 'nlp': 'NLP', 'ai': 'AI',
  'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch', 'pandas': 'Pandas', 'numpy': 'NumPy',
  'spark': 'Apache Spark', 'hadoop': 'Hadoop',
  'tableau': 'Tableau', 'power bi': 'Power BI', 'powerbi': 'Power BI',
  'salesforce': 'Salesforce', 'sap': 'SAP',
  'next.js': 'Next.js', 'nextjs': 'Next.js', 'nuxt': 'Nuxt.js',
  'express': 'Express.js', 'expressjs': 'Express.js', 'fastapi': 'FastAPI',
  'django': 'Django', 'flask': 'Flask', 'spring': 'Spring', 'spring boot': 'Spring Boot',
  '.net': '.NET', 'dotnet': '.NET', 'asp.net': 'ASP.NET',
  'redux': 'Redux', 'mobx': 'MobX', 'tailwind': 'Tailwind CSS', 'tailwindcss': 'Tailwind CSS',
  'bootstrap': 'Bootstrap', 'material ui': 'Material UI', 'mui': 'Material UI',
  'webpack': 'Webpack', 'vite': 'Vite',
  'jest': 'Jest', 'cypress': 'Cypress', 'selenium': 'Selenium', 'playwright': 'Playwright',
  'firebase': 'Firebase', 'supabase': 'Supabase', 'heroku': 'Heroku', 'vercel': 'Vercel',
  'snowflake': 'Snowflake', 'databricks': 'Databricks', 'airflow': 'Airflow',
  'microservices': 'Microservices', 'serverless': 'Serverless',
  'oauth': 'OAuth', 'jwt': 'JWT', 'sso': 'SSO',
  'excel': 'Excel', 'powerpoint': 'PowerPoint',
};

const TITLE_SKILL_MAP: Record<string, string[]> = {
  'software engineer': ['JavaScript', 'Python', 'SQL', 'Git', 'REST APIs', 'Agile', 'Docker', 'AWS'],
  'frontend': ['JavaScript', 'React', 'CSS', 'HTML', 'TypeScript', 'Git', 'REST APIs', 'Figma'],
  'backend': ['Python', 'Node.js', 'SQL', 'REST APIs', 'Docker', 'AWS', 'Git', 'PostgreSQL'],
  'full stack': ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'REST APIs', 'Docker', 'TypeScript'],
  'data engineer': ['Python', 'SQL', 'Apache Spark', 'AWS', 'ETL', 'Airflow', 'Docker', 'PostgreSQL'],
  'data scientist': ['Python', 'Machine Learning', 'SQL', 'Pandas', 'TensorFlow', 'NumPy', 'Deep Learning', 'R'],
  'data analyst': ['SQL', 'Python', 'Excel', 'Tableau', 'Power BI', 'Pandas', 'Analytical Skills', 'Communication'],
  'devops': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Linux', 'Git', 'Jenkins'],
  'cloud engineer': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Linux', 'CI/CD'],
  'machine learning': ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'SQL', 'NumPy', 'Pandas'],
  'ai engineer': ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Docker', 'SQL'],
  'mobile developer': ['React', 'JavaScript', 'TypeScript', 'Swift', 'Kotlin', 'Git', 'REST APIs', 'Firebase'],
  'qa engineer': ['Selenium', 'Jest', 'Cypress', 'SQL', 'Git', 'Agile', 'REST APIs', 'JavaScript'],
  'product manager': ['Agile', 'Scrum', 'Jira', 'Analytical Skills', 'Communication', 'Leadership', 'SQL', 'Product Management'],
  'project manager': ['Agile', 'Scrum', 'Jira', 'Project Management', 'Communication', 'Leadership', 'Excel', 'Analytical Skills'],
  'security engineer': ['Linux', 'AWS', 'Python', 'Docker', 'CI/CD', 'Git', 'Bash', 'Kubernetes'],
  'ui/ux designer': ['Figma', 'Sketch', 'CSS', 'HTML', 'JavaScript', 'Communication', 'Analytical Skills', 'Bootstrap'],
  'business analyst': ['SQL', 'Excel', 'Tableau', 'Power BI', 'Analytical Skills', 'Communication', 'Jira', 'Agile'],
};

function getTitleFallbackSkills(title: string): string[] {
  const t = title.toLowerCase();
  for (const [key, skills] of Object.entries(TITLE_SKILL_MAP)) {
    if (t.includes(key)) return skills;
  }
  return [];
}

const SKILL_PATTERNS = Object.keys(COMMON_SKILLS).sort((a, b) => b.length - a.length);
const MIN_SKILLS = 8;

function extractSalaryFromDescription(description: string): string | null {
  if (!description) return null;
  const patterns = [
    /\$[\d,]+(?:\.\d+)?[kK]?\s*[-–to]+\s*\$[\d,]+(?:\.\d+)?[kK]?\s*(?:per\s+(?:year|annum|hour|hr)|\/(?:yr|hr|hour|year)|annually|hourly)?/gi,
    /\$[\d,]+(?:\.\d+)?[kK]?\s*(?:per\s+(?:year|annum|hour|hr)|\/(?:yr|hr|hour|year)|annually|hourly)/gi,
    /(?:salary|pay|compensation|base|annual|hourly)\s*(?:range|rate)?[\s:]*\$[\d,]+(?:\.\d+)?[kK]?\s*[-–to]*\s*\$?[\d,]*(?:\.\d+)?[kK]?/gi,
    /\$[\d,]+(?:\.\d+)?[kK]?\s*[-–]\s*\$[\d,]+(?:\.\d+)?[kK]?/gi,
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0].trim().replace(/\s+/g, ' ');
    }
  }
  return null;
}

function extractSkillsFromDescription(description: string): string[] {
  if (!description) return [];
  const text = description.toLowerCase();
  const foundSkills = new Set<string>();

  for (const pattern of SKILL_PATTERNS) {
    const regex = new RegExp(`(?:^|[\\s,;/|()•\\-])${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,;/|()•\\-])`, 'i');
    if (regex.test(text)) {
      foundSkills.add(COMMON_SKILLS[pattern]);
    }
  }

  return Array.from(foundSkills).slice(0, 20);
}

function enrichSkillsWithFallback(title: string, description: string, csvSkills: string[]): string[] {
  const merged = new Set<string>();
  // Normalize CSV skills
  for (const s of csvSkills) {
    const norm = COMMON_SKILLS[s.toLowerCase()] || s;
    merged.add(norm);
  }
  // Extract from description
  for (const s of extractSkillsFromDescription(description)) {
    merged.add(s);
  }
  // Title-based fallback if still under minimum
  if (merged.size < MIN_SKILLS) {
    for (const s of getTitleFallbackSkills(title)) {
      if (!new Set([...merged].map(x => x.toLowerCase())).has(s.toLowerCase())) {
        merged.add(s);
      }
      if (merged.size >= MIN_SKILLS) break;
    }
  }
  return Array.from(merged).slice(0, 20);
}

function sanitizeCSVValue(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

function deduplicateCSVJobs(jobs: CSVJob[]): { unique: CSVJob[]; csvDuplicates: number } {
  const seen = new Map<string, boolean>();
  const unique: CSVJob[] = [];
  let csvDuplicates = 0;

  for (const job of jobs) {
    const linkKey = job.external_apply_link.toLowerCase().trim();
    const comboKey = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}|${job.location.toLowerCase().trim()}`;

    if (seen.has(linkKey) || seen.has(comboKey)) {
      csvDuplicates++;
      continue;
    }

    seen.set(linkKey, true);
    seen.set(comboKey, true);
    unique.push(job);
  }

  return { unique, csvDuplicates };
}

/** RFC 4180-compliant CSV row splitter that handles multiline quoted fields and "" escapes */
function splitCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const fields: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = "";
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++; // skip \n after \r
        }
        fields.push(current.trim());
        current = "";
        if (fields.some(f => f.length > 0)) {
          rows.push([...fields]);
        }
        fields.length = 0;
      } else {
        current += ch;
      }
    }
  }
  // Last field / last row
  fields.push(current.trim());
  if (fields.some(f => f.length > 0)) {
    rows.push([...fields]);
  }

  return rows;
}

function parseCSV(text: string): ParseResult {
  const allRows = splitCSVRows(text);
  if (allRows.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }] };
  }

  const rawHeaders = allRows[0].map((h) => h.replace(/^["']|["']$/g, "").trim());
  const { mapped: header, unmapped: missingFields } = mapHeaders(rawHeaders);
  
  if (missingFields.length > 0) {
    return { valid: [], errors: [{ row: 0, message: `Missing required columns: ${missingFields.join(", ")}. Your headers: ${rawHeaders.join(", ")}` }] };
  }

  const valid: CSVJob[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const values = allRows[i];

    const row: Record<string, string> = {};
    header.forEach((field, index) => {
      row[field] = sanitizeCSVValue(values[index]?.replace(/^["']|["']$/g, "") || "");
    });

    // Only block the row if a CRITICAL field (title or external_apply_link) is missing.
    const rowMissing = CRITICAL_FIELDS.filter((f) => !row[f]);
    if (rowMissing.length > 0) {
      errors.push({ row: i + 1, message: `Missing critical field(s): ${rowMissing.join(", ")}` });
      continue;
    }

    // Auto-prepend https:// if missing but looks like a URL
    if (!row.external_apply_link.startsWith("http://") && !row.external_apply_link.startsWith("https://")) {
      if (row.external_apply_link.includes(".")) {
        row.external_apply_link = "https://" + row.external_apply_link;
      } else {
        errors.push({ row: i + 1, message: "external_apply_link must be a valid URL" });
        continue;
      }
    }
    // Upgrade http to https
    if (row.external_apply_link.startsWith("http://")) {
      row.external_apply_link = row.external_apply_link.replace("http://", "https://");
    }

    if (isDiceLink(row.external_apply_link)) {
      errors.push({ row: i + 1, message: "Dice links are not allowed" });
      continue;
    }

    // Block jobs requiring more than 5 years of experience.
    if (isHighExperienceJob({
      title: row.title,
      description: row.description || "",
      experience_years: row.experience_years || null,
    })) {
      errors.push({ row: i + 1, message: "Job requires more than 5 years of experience (only 0–5 years allowed)" });
      continue;
    }

    // Apply graceful defaults for non-critical fields so we don't lose real jobs.
    valid.push({
      title: row.title,
      company: row.company || "Unknown Company",
      location: row.location || "Location not specified",
      description: row.description || "No description available",
      skills: row.skills,
      external_apply_link: row.external_apply_link,
      employment_type: row.employment_type || "Full Time",
      experience_years: row.experience_years || undefined,
      salary_range: row.salary_range || undefined,
      company_logo: row.company_logo || undefined,
      posted_date: row.posted_date || undefined,
    });
  }

  return { valid, errors };
}

interface CSVBulkUploadProps {
  onComplete?: () => void;
}

export function CSVBulkUpload({ onComplete }: CSVBulkUploadProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const removeDuplicates = useRemoveDuplicates();

  const uploadMutation = useMutation({
    mutationFn: async (jobs: CSVJob[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const totalCSVRows = jobs.length;

      // Step 1: Deduplicate within CSV
      const { unique, csvDuplicates } = deduplicateCSVJobs(jobs);

      // Step 2: Fetch existing jobs for DB-level dedup
      const existingLinks = new Set<string>();
      const existingCombos = new Set<string>();

      // Fetch in pages of 1000
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from("jobs")
          .select("external_apply_link, title, company, location")
          .range(from, from + pageSize - 1);
        
        if (!data || data.length === 0) break;
        
        for (const j of data) {
          if (j.external_apply_link) {
            existingLinks.add(j.external_apply_link.toLowerCase().trim());
          }
          existingCombos.add(`${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}|${j.location.toLowerCase().trim()}`);
        }
        
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Filter out jobs that already exist in DB
      const newJobs = unique.filter((job) => {
        const linkKey = job.external_apply_link.toLowerCase().trim();
        if (existingLinks.has(linkKey)) return false;
        
        const comboKey = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}|${job.location.toLowerCase().trim()}`;
        if (existingCombos.has(comboKey)) return false;
        
        return true;
      });

      const dbSkipped = unique.length - newJobs.length;

      // Step 3: Insert new jobs in batches
      let uploaded = 0;
      const batchSize = 10;
      for (let i = 0; i < newJobs.length; i += batchSize) {
        const batch = newJobs.slice(i, i + batchSize).map((job) => ({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: enrichSkillsWithFallback(
            job.title,
            job.description,
            job.skills ? job.skills.split(",").map((s) => s.trim()).filter(Boolean) : []
          ),
          external_apply_link: job.external_apply_link,
          employment_type: job.employment_type || "Full Time",
          experience_years: job.experience_years || null,
          salary_range: job.salary_range || extractSalaryFromDescription(job.description) || null,
          company_logo: resolveLogo(job.company_logo, job.external_apply_link, job.company),
          // Always stamp ingestion time so users see "just now" / "X minutes ago"
          // for freshly imported jobs, even if the CSV had a stale posted_date.
          posted_date: new Date().toISOString(),
          is_published: true,
          is_reviewing: false,
          created_by_user_id: user.id,
        }));

        const { error } = await supabase.from("jobs").insert(batch);
        if (error) throw error;

        uploaded += batch.length;
        setUploadProgress(Math.round((uploaded / Math.max(newJobs.length, 1)) * 100));
      }

      // Step 4: Clean old duplicates from DB
      let oldDuplicatesRemoved = 0;
      try {
        const { data: result } = await supabase.rpc("remove_duplicate_jobs");
        if (result && typeof result === "object" && "removed" in (result as Record<string, unknown>)) {
          oldDuplicatesRemoved = (result as { removed: number }).removed;
        }
      } catch {
        // Non-critical, don't fail upload
      }

      return {
        totalRows: totalCSVRows,
        inserted: newJobs.length,
        skippedDuplicates: csvDuplicates + dbSkipped,
        oldDuplicatesRemoved,
      } satisfies UploadSummary;
    },
    onSuccess: (summary) => {
      setUploadSummary(summary);
      toast.success(
        `${summary.inserted} jobs uploaded successfully. ${summary.skippedDuplicates} duplicates skipped.${summary.oldDuplicatesRemoved > 0 ? ` ${summary.oldDuplicatesRemoved} old duplicates removed.` : ""}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => {
      toast.error("Upload failed: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileNames(Array.from(files).map(f => f.name));
    setUploadSummary(null);

    const allValid: CSVJob[] = [];
    const allErrors: { row: number; message: string }[] = [];
    let filesRead = 0;

    Array.from(files).forEach((file, fileIndex) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const result = parseCSV(text);
        // Prefix errors with file name for clarity
        for (const err of result.errors) {
          allErrors.push({ row: err.row, message: `[${file.name}] ${err.message}` });
        }
        allValid.push(...result.valid);
        filesRead++;
        if (filesRead === files.length) {
          setParseResult({ valid: allValid, errors: allErrors });
        }
      };
      reader.readAsText(file);
    });
  };

  const reset = () => {
    setParseResult(null);
    setFileNames([]);
    setUploadProgress(0);
    setUploadSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = () => {
    if (parseResult?.valid.length) {
      uploadMutation.mutate(parseResult.valid);
    }
  };

  return (
    <Card className="p-6 border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bulk Upload Jobs</h3>
            <p className="text-sm text-muted-foreground">Upload multiple jobs via CSV (duplicates auto-skipped)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeDuplicates.mutate()}
            disabled={removeDuplicates.isPending}
          >
            {removeDuplicates.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Remove Existing Duplicates
          </Button>
          {parseResult && (
            <Button variant="ghost" size="icon" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Upload Summary */}
      {uploadSummary && (
        <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
          <h4 className="text-sm font-semibold text-foreground mb-2">Upload Summary</h4>
          <p className="text-sm text-foreground">Total rows in CSV: <strong>{uploadSummary.totalRows}</strong></p>
          <p className="text-sm text-foreground">New jobs inserted: <strong className="text-primary">{uploadSummary.inserted}</strong></p>
          <p className="text-sm text-foreground">Duplicate jobs skipped: <strong className="text-muted-foreground">{uploadSummary.skippedDuplicates}</strong></p>
          <p className="text-sm text-foreground">Old duplicates removed: <strong className="text-destructive">{uploadSummary.oldDuplicatesRemoved}</strong></p>
        </div>
      )}

      {!parseResult ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Select one or multiple CSV files to upload
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Choose File
          </Button>
          
          <div className="mt-6 text-left">
            <p className="text-xs font-medium text-foreground mb-2">Required columns:</p>
            <div className="flex flex-wrap gap-1.5">
              {REQUIRED_FIELDS.map((field) => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Optional: employment_type, experience_years, salary_range, company_logo, posted_date
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg flex-wrap">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files: ${fileNames.join(", ")}`}
            </span>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-text" />
              <span className="text-sm text-foreground">
                {parseResult.valid.length} valid jobs
              </span>
            </div>
            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-foreground">
                  {parseResult.errors.length} errors
                </span>
              </div>
            )}
          </div>

          {/* Errors */}
          {parseResult.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 p-3 bg-destructive/10 rounded-lg">
              {parseResult.errors.slice(0, 10).map((error, i) => (
                <p key={i} className="text-xs text-destructive">
                  Row {error.row}: {error.message}
                </p>
              ))}
              {parseResult.errors.length > 10 && (
                <p className="text-xs text-destructive font-medium">
                  ... and {parseResult.errors.length - 10} more errors
                </p>
              )}
            </div>
          )}

          {/* Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset} disabled={uploadMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleUpload}
              disabled={parseResult.valid.length === 0 || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Upload {parseResult.valid.length} Jobs</>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
