import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetRow {
  posted_date: string;
  title: string;
  company: string;
  location: string;
  description_short: string;
  description_full: string;
  apply_link: string;
  job_type?: string;
  experience_years?: string;
  salary?: string;
  skills?: string;
  actively_reviewing?: string;
  company_logo_url?: string;
  is_published?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}


function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === 'yes' || lower === '1';
}

function parseSkills(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

const DICE_PATTERNS = ['dice.com', 'www.dice.com', 'employer.dice.com'];

function isDiceLink(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DICE_PATTERNS.some(p => hostname === p || hostname.endsWith('.' + p));
  } catch {
    return url.toLowerCase().includes('dice.com');
  }
}

const COMMON_SKILLS: Record<string, string> = {
  'js': 'JavaScript', 'javascript': 'JavaScript', 'typescript': 'TypeScript', 'ts': 'TypeScript',
  'react': 'React', 'reactjs': 'React', 'react.js': 'React',
  'angular': 'Angular', 'vue': 'Vue.js', 'vuejs': 'Vue.js',
  'node': 'Node.js', 'nodejs': 'Node.js', 'node.js': 'Node.js',
  'python': 'Python', 'java': 'Java', 'c#': 'C#', 'c++': 'C++',
  'go': 'Go', 'golang': 'Go', 'rust': 'Rust', 'ruby': 'Ruby', 'php': 'PHP', 'swift': 'Swift',
  'kotlin': 'Kotlin', 'scala': 'Scala',
  'html': 'HTML', 'css': 'CSS', 'sass': 'Sass', 'scss': 'Sass',
  'sql': 'SQL', 'mysql': 'MySQL', 'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL',
  'mongodb': 'MongoDB', 'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
  'dynamodb': 'DynamoDB', 'oracle': 'Oracle',
  'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP', 'google cloud': 'GCP',
  'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
  'terraform': 'Terraform', 'ansible': 'Ansible', 'jenkins': 'Jenkins',
  'git': 'Git', 'ci/cd': 'CI/CD',
  'rest': 'REST APIs', 'graphql': 'GraphQL', 'grpc': 'gRPC',
  'kafka': 'Kafka', 'rabbitmq': 'RabbitMQ',
  'linux': 'Linux', 'bash': 'Bash',
  'agile': 'Agile', 'scrum': 'Scrum', 'jira': 'Jira', 'figma': 'Figma',
  'machine learning': 'Machine Learning', 'ml': 'Machine Learning',
  'deep learning': 'Deep Learning', 'nlp': 'NLP', 'ai': 'AI',
  'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch', 'pandas': 'Pandas',
  'spark': 'Apache Spark', 'hadoop': 'Hadoop',
  'tableau': 'Tableau', 'power bi': 'Power BI',
  'salesforce': 'Salesforce', 'sap': 'SAP',
  'next.js': 'Next.js', 'nextjs': 'Next.js',
  'express': 'Express.js', 'fastapi': 'FastAPI',
  'django': 'Django', 'flask': 'Flask', 'spring': 'Spring', 'spring boot': 'Spring Boot',
  '.net': '.NET', 'asp.net': 'ASP.NET',
  'redux': 'Redux', 'tailwind': 'Tailwind CSS',
  'bootstrap': 'Bootstrap', 'material ui': 'Material UI',
  'webpack': 'Webpack', 'vite': 'Vite',
  'jest': 'Jest', 'cypress': 'Cypress', 'selenium': 'Selenium',
  'firebase': 'Firebase', 'supabase': 'Supabase',
  'snowflake': 'Snowflake', 'databricks': 'Databricks', 'airflow': 'Airflow',
  'microservices': 'Microservices', 'serverless': 'Serverless',
  'oauth': 'OAuth', 'jwt': 'JWT', 'sso': 'SSO',
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
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;/|()•\\-])${escaped}(?:$|[\\s,;/|()•\\-])`, 'i');
    if (regex.test(text)) {
      foundSkills.add(COMMON_SKILLS[pattern]);
    }
  }
  return Array.from(foundSkills).slice(0, 20);
}

function enrichSkillsWithFallback(title: string, description: string, csvSkills: string[]): string[] {
  const merged = new Set<string>();
  for (const s of csvSkills) {
    merged.add(COMMON_SKILLS[s.toLowerCase()] || s);
  }
  for (const s of extractSkillsFromDescription(description)) {
    merged.add(s);
  }
  if (merged.size < MIN_SKILLS) {
    const lowerSet = new Set([...merged].map(x => x.toLowerCase()));
    for (const s of getTitleFallbackSkills(title)) {
      if (!lowerSet.has(s.toLowerCase())) {
        merged.add(s);
        lowerSet.add(s.toLowerCase());
      }
      if (merged.size >= MIN_SKILLS) break;
    }
  }
  return Array.from(merged).slice(0, 20);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try MM/DD/YYYY format
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    const parsed = new Date(y, m - 1, d);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  return null;
}

function extractSheetId(url: string): string | null {
  // Handle various Google Sheets URL formats
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchSheetData(sheetUrl: string): Promise<{ headers: string[]; rows: string[][] }> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('Invalid Google Sheets URL. Please use a public sheet URL.');
  }
  
  // Use Google Sheets CSV export endpoint (works for public sheets)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  
  console.log(`Fetching sheet: ${sheetId}`);
  
  const response = await fetch(csvUrl);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Sheet not found. Make sure the sheet is publicly accessible (Anyone with link can view).');
    }
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  const lines = parseCSV(csvText);
  
  if (lines.length < 2) {
    throw new Error('Sheet must have at least a header row and one data row.');
  }
  
  const headers = lines[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  const rows = lines.slice(1);
  
  return { headers, rows };
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
  }
  
  // Handle last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

function sanitizeCSVValue(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousChars.some(char => trimmed.startsWith(char))) {
    // Only sanitize if it looks like a formula (not a normal negative number or email)
    if (trimmed.startsWith('-') && /^-[\d.,]+$/.test(trimmed)) return value;
    if (trimmed.startsWith('@') && !trimmed.includes('(')) return value;
    return "'" + trimmed;
  }
  return value;
}

function rowToObject(headers: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = sanitizeCSVValue(row[i] || '');
  });
  return obj;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to check admin status
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check that user is founder OR employer with post permission
    const { data: isFounderData } = await supabaseAuth.rpc('is_founder');
    const { data: hasPostPermission } = await supabaseAuth.rpc('has_employer_permission', { permission_name: 'can_post_jobs' });
    
    if (!isFounderData && !hasPostPermission) {
      return new Response(
        JSON.stringify({ error: 'Employer or founder access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { sheet_url, action } = body;

    if (!sheet_url) {
      return new Response(
        JSON.stringify({ error: 'sheet_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test connection - just validate we can fetch the sheet
    if (action === 'test') {
      console.log('Testing connection to sheet...');
      const { headers, rows } = await fetchSheetData(sheet_url);
      
      const requiredColumns = ['posted_date', 'title', 'company', 'location', 'description_short', 'description_full', 'apply_link'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Missing required columns: ${missingColumns.join(', ')}`,
            found_columns: headers
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection successful!',
          row_count: rows.length,
          columns: headers
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import action
    if (action === 'import') {
      console.log('Starting import...');
      
      // Use service role for import operations
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { headers, rows } = await fetchSheetData(sheet_url);
      
      // Validate required columns
      const requiredColumns = ['posted_date', 'title', 'company', 'location', 'description_short', 'description_full', 'apply_link'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        return new Response(
          JSON.stringify({ error: `Missing required columns: ${missingColumns.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Limit to 500 rows per import
      const limitedRows = rows.slice(0, 500);
      
      // Get existing apply_links for duplicate detection
      const { data: existingJobs } = await supabaseAdmin
        .from('jobs')
        .select('external_apply_link, title, company, posted_date');
      
      const existingLinks = new Set(existingJobs?.map(j => j.external_apply_link) || []);
      const existingJobKeys = new Set(
        existingJobs?.map(j => `${j.title}|${j.company}|${j.posted_date}`) || []
      );

      const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
      const jobsToInsert: any[] = [];

      for (let i = 0; i < limitedRows.length; i++) {
        const rowNum = i + 2; // Account for header row and 0-indexing
        const row = rowToObject(headers, limitedRows[i]);
        
        try {
          // Validate required fields
          if (!row.title?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing title' });
            continue;
          }
          if (!row.company?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing company' });
            continue;
          }
          if (!row.apply_link?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing apply_link' });
            continue;
          }
          if (isDiceLink(row.apply_link)) {
            result.errors.push({ row: rowNum, message: 'Dice links are not allowed' });
            continue;
          }
          if (!isValidUrl(row.apply_link)) {
            result.errors.push({ row: rowNum, message: 'Invalid apply_link URL' });
            continue;
          }
          if (!row.posted_date?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing posted_date' });
            continue;
          }
          
          const postedDate = parseDate(row.posted_date);
          if (!postedDate) {
            result.errors.push({ row: rowNum, message: 'Invalid posted_date format' });
            continue;
          }

          // Check for duplicates
          if (existingLinks.has(row.apply_link)) {
            result.skipped++;
            continue;
          }
          
          const jobKey = `${row.title}|${row.company}|${postedDate.toISOString()}`;
          if (existingJobKeys.has(jobKey)) {
            result.skipped++;
            continue;
          }

          // Map employment type
          let employmentType = 'Full Time';
          if (row.job_type) {
            const jt = row.job_type.toLowerCase();
            if (jt.includes('contract')) employmentType = 'Contract';
            else if (jt.includes('intern')) employmentType = 'Internship';
            else if (jt.includes('part')) employmentType = 'Part Time';
          }

          // Build description
          const description = row.description_full || row.description_short || '';

          // Skip jobs requiring 6+ years of experience (per title or description)
          const expYearsNum = (() => {
            const nums = (row.experience_years || '').match(/\d+/g);
            return nums?.length ? Math.max(...nums.map(Number)) : null;
          })();
          if (expYearsNum !== null && expYearsNum > 5) {
            result.skipped++;
            continue;
          }
          const highExpPatterns = [
            /\b([6-9]|[1-9]\d)\+?\s*[-–]?\s*(?:\d+\s*)?(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp\.?)?/i,
            /(?:minimum|at\s+least|requires?)\s*(?:of\s+)?([6-9]|[1-9]\d)\s*(?:years?|yrs?)/i,
            /(?:experience|exp\.?)\s*(?:required)?[\s:]+([6-9]|[1-9]\d)\+?\s*(?:years?|yrs?)/i,
          ];
          let highExp = false;
          for (const p of highExpPatterns) {
            const m = description.match(p);
            if (m) {
              const n = parseInt(m[0].match(/\d+/)?.[0] || '0', 10);
              if (n > 5) { highExp = true; break; }
            }
          }
          if (highExp) {
            result.skipped++;
            continue;
          }

          jobsToInsert.push({
            title: row.title.trim(),
            company: row.company.trim(),
            location: row.location?.trim() || 'Remote',
            description: description.trim(),
            external_apply_link: row.apply_link.trim(),
            // Always stamp ingestion time so imported jobs surface as "just now"
            // for users, regardless of the date in the source sheet.
            posted_date: new Date().toISOString(),
            employment_type: employmentType,
            experience_years: row.experience_years?.trim() || null,
            salary_range: row.salary?.trim() || extractSalaryFromDescription(description) || null,
            skills: enrichSkillsWithFallback(
              row.title.trim(),
              description,
              parseSkills(row.skills)
            ),
            is_reviewing: parseBoolean(row.actively_reviewing),
            company_logo: row.company_logo_url?.trim() || null,
            is_published: row.is_published !== undefined ? parseBoolean(row.is_published) : true,
            created_by_user_id: user.id,
          });
          
          // Mark as existing to prevent duplicates within same batch
          existingLinks.add(row.apply_link);
          existingJobKeys.add(jobKey);
          
        } catch (err) {
          console.error(`Error processing row ${rowNum}:`, err);
          result.errors.push({ row: rowNum, message: String(err) });
        }
      }

      // Batch insert all valid jobs
      if (jobsToInsert.length > 0) {
        console.log(`Inserting ${jobsToInsert.length} jobs...`);
        const { error: insertError } = await supabaseAdmin
          .from('jobs')
          .insert(jobsToInsert);
        
        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: `Failed to insert jobs: ${insertError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result.imported = jobsToInsert.length;

        // Trigger silent description enrichment for short descriptions (background, non-blocking)
        try {
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-job-description`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({}),
          }).catch((e) => console.error("[import-google-sheet] enrich trigger failed:", e));
        } catch (e) {
          console.error("[import-google-sheet] enrich trigger failed:", e);
        }
      }

      // Save import history
      const { error: historyError } = await supabaseAdmin
        .from('import_history')
        .insert({
          user_id: user.id,
          sheet_url: sheet_url,
          imported_count: result.imported,
          skipped_count: result.skipped,
          error_count: result.errors.length,
          errors: result.errors,
        });
      
      if (historyError) {
        console.error('Failed to save import history:', historyError);
      }

      console.log(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);

      return new Response(
        JSON.stringify({
          success: true,
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors.slice(0, 50), // Limit error details returned
          total_rows: limitedRows.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "test" or "import".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
