import { Job } from "@/types/job";

// Skill extraction dictionary
const COMMON_SKILLS: Record<string, string> = {
  'js': 'JavaScript', 'javascript': 'JavaScript', 'typescript': 'TypeScript', 'ts': 'TypeScript',
  'react': 'React', 'reactjs': 'React', 'react.js': 'React',
  'angular': 'Angular', 'vue': 'Vue.js', 'vuejs': 'Vue.js',
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
  'express': 'Express.js', 'fastapi': 'FastAPI',
  'django': 'Django', 'flask': 'Flask', 'spring': 'Spring', 'spring boot': 'Spring Boot',
  '.net': '.NET', 'dotnet': '.NET', 'asp.net': 'ASP.NET',
  'redux': 'Redux', 'tailwind': 'Tailwind CSS', 'tailwindcss': 'Tailwind CSS',
  'bootstrap': 'Bootstrap', 'material ui': 'Material UI', 'mui': 'Material UI',
  'webpack': 'Webpack', 'vite': 'Vite',
  'jest': 'Jest', 'cypress': 'Cypress', 'selenium': 'Selenium', 'playwright': 'Playwright',
  'firebase': 'Firebase', 'supabase': 'Supabase',
  'snowflake': 'Snowflake', 'databricks': 'Databricks', 'airflow': 'Airflow',
  'microservices': 'Microservices', 'serverless': 'Serverless',
  'oauth': 'OAuth', 'jwt': 'JWT', 'sso': 'SSO',
  'excel': 'Excel', 'sharepoint': 'SharePoint',
  'data engineering': 'Data Engineering', 'etl': 'ETL',
  'data warehouse': 'Data Warehouse', 'data pipeline': 'Data Pipeline',
  'devops': 'DevOps', 'sre': 'SRE',
  'project management': 'Project Management', 'product management': 'Product Management',
  'communication': 'Communication', 'leadership': 'Leadership',
  'problem solving': 'Problem Solving', 'analytical': 'Analytical Skills',
};

// Title-based fallback skills when description is weak
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
  'solutions architect': ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Microservices', 'REST APIs', 'SQL', 'Terraform'],
  'scrum master': ['Agile', 'Scrum', 'Jira', 'Communication', 'Leadership', 'Project Management', 'Analytical Skills', 'Confluence'],
};

function getTitleFallbackSkills(title: string): string[] {
  const t = title.toLowerCase();
  for (const [key, skills] of Object.entries(TITLE_SKILL_MAP)) {
    if (t.includes(key)) return skills;
  }
  return [];
}

const SKILL_PATTERNS = Object.keys(COMMON_SKILLS).sort((a, b) => b.length - a.length);

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
  return Array.from(foundSkills);
}

const MIN_SKILLS = 8;

/** Enrich job skills to at least 8 by extracting from description + title fallback */
export function enrichJobSkills(job: Job): string[] {
  const existing = new Set(job.skills.map(s => s.toLowerCase()));
  const merged = [...job.skills];

  // Step 1: extract from description
  const extracted = extractSkillsFromDescription(job.description);
  for (const skill of extracted) {
    if (!existing.has(skill.toLowerCase())) {
      merged.push(skill);
      existing.add(skill.toLowerCase());
    }
  }

  // Step 2: title-based fallback if still under minimum
  if (merged.length < MIN_SKILLS) {
    const fallback = getTitleFallbackSkills(job.title);
    for (const skill of fallback) {
      if (!existing.has(skill.toLowerCase())) {
        merged.push(skill);
        existing.add(skill.toLowerCase());
      }
      if (merged.length >= MIN_SKILLS) break;
    }
  }

  return merged;
}

/** Extract salary from description if not already set */
export function extractSalary(job: Job): string | null {
  if (job.salary_range) {
    if (/nan/i.test(job.salary_range) || /none/i.test(job.salary_range)) return null;
    return job.salary_range;
  }
  if (!job.description) return null;
  const patterns = [
    /\$[\d,]+(?:\.\d+)?[kK]?\s*[-–to]+\s*\$[\d,]+(?:\.\d+)?[kK]?\s*(?:per\s+(?:year|annum|hour|hr)|\/(?:yr|hr|hour|year)|annually|hourly)?/gi,
    /\$[\d,]+(?:\.\d+)?[kK]?\s*(?:per\s+(?:year|annum|hour|hr)|\/(?:yr|hr|hour|year)|annually|hourly)/gi,
    /(?:salary|pay|compensation|base|annual|hourly)\s*(?:range|rate)?[\s:]*\$[\d,]+(?:\.\d+)?[kK]?\s*[-–to]*\s*\$?[\d,]*(?:\.\d+)?[kK]?/gi,
    /\$[\d,]+(?:\.\d+)?[kK]?\s*[-–]\s*\$[\d,]+(?:\.\d+)?[kK]?/gi,
  ];
  for (const p of patterns) {
    const m = job.description.match(p);
    if (m) return m[0].trim().replace(/\s+/g, ' ');
  }
  return null;
}

/** Sort jobs strictly by posted_date descending (newest first) */
function sortByRecency(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    return (b.posted_date?.getTime() || 0) - (a.posted_date?.getTime() || 0);
  });
}

/** Spread similar jobs so near-duplicates don't appear back-to-back */
export function spreadSimilarJobs(jobs: Job[]): Job[] {
  if (jobs.length <= 2) return jobs;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  function areSimilar(a: Job, b: Job): boolean {
    const tA = normalize(a.title), tB = normalize(b.title);
    const cA = normalize(a.company), cB = normalize(b.company);
    // Same company + very similar title
    if (cA === cB && (tA === tB || tA.includes(tB) || tB.includes(tA))) return true;
    // Same title from different source but same-ish company name
    if (tA === tB && (cA.includes(cB) || cB.includes(cA))) return true;
    return false;
  }

  const result: Job[] = [jobs[0]];
  const remaining = jobs.slice(1);
  const deferred: Job[] = [];

  for (const job of remaining) {
    const last = result[result.length - 1];
    if (areSimilar(job, last)) {
      deferred.push(job);
    } else {
      result.push(job);
      // Try to insert a deferred job if it's no longer similar to current tail
      if (deferred.length > 0) {
        const idx = deferred.findIndex(d => !areSimilar(d, job));
        if (idx !== -1) {
          result.push(deferred.splice(idx, 1)[0]);
        }
      }
    }
  }

  // Append remaining deferred, spacing them out
  for (const d of deferred) {
    result.push(d);
  }

  return result;
}

import { isTutorListing, isNonEntryLevelJob, isHighExperienceJob } from "@/lib/jobFilters";
import { getBestLocation } from "@/lib/locationExtractor";
import { isUSALocation } from "@/lib/usaLocationFilter";

/** Enrich a list of jobs: skills, salary, location.
 *  Preserves the server's relevance order (title-priority first, newest within each tier).
 *  We deliberately do NOT apply isHighExperienceJob here — Senior/Lead/Staff titles
 *  are valid matches and were being stripped from search results.
 */
export function enrichJobList(jobs: Job[], entryLevelOnly = false): Job[] {
  let filtered = jobs.filter(job => !isTutorListing(job));
  // Remove jobs with empty/missing descriptions
  filtered = filtered.filter(job => job.description && job.description.trim().length >= 20);
  // Hard rule: never show jobs requiring more than 5 years of experience.
  filtered = filtered.filter(job => !isHighExperienceJob(job));
  // LinkedIn-direct apply links are now filtered out at the SQL layer
  // (see search_jobs / count_search_jobs / get_job_counts) so pagination stays consistent.
  if (entryLevelOnly) {
    filtered = filtered.filter(job => !isNonEntryLevelJob(job));
  }
  return filtered.map(job => ({
    ...job,
    skills: enrichJobSkills(job),
    salary_range: extractSalary(job),
    location: getBestLocation(job.location, job.description),
  }));
}
