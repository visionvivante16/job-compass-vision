/**
 * Shared types + helpers for the editable tailored resume.
 *
 * The editor now operates STRICTLY on the user's uploaded resume structure —
 * the AI tailor only rewords bullets/summary and reorders skills. Every
 * bullet carries its `original` text and a `changed` flag so the editor can
 * highlight what was modified in teal.
 */

import type {
  ResumeStructure,
  ResumeStructureItem,
} from "@/hooks/useResumeStructure";
import type { TailoredResumeData } from "@/hooks/useTailoredResume";

export interface ResumeBullet {
  id: string;
  text: string;
  original?: string;
  changed?: boolean;
}

export interface ResumeItem {
  id: string;
  heading: string;
  subheading?: string;
  date?: string;
  bullets: ResumeBullet[];
}

export interface ResumeSection {
  id: string;
  /** "summary" / "skills" are surfaced separately. Other sections preserve their original title. */
  key: "summary" | "skills" | "custom";
  title: string;
  visible: boolean;
  items: ResumeItem[];
  /** True if this section came from the resume itself (so we don't reorder it). */
  fromResume?: boolean;
}

export interface ResumeHeader {
  full_name: string;
  contact_line: string;
}

/** Tokens used in `order` to position summary/skills inline among custom sections. */
export type SectionOrderToken =
  | "summary"
  | "skills"
  | { kind: "custom"; sectionId: string };

export interface EditableResume {
  header: ResumeHeader;
  summary: string;
  /** True when the AI rewrote the summary (drives teal highlight on summary box). */
  summary_changed?: boolean;
  /** Original summary before tailoring. */
  summary_original?: string;
  skills: string[];
  /** Sections IN THE EXACT ORDER they appeared in the user's uploaded resume. */
  sections: ResumeSection[];
  /** Top-to-bottom render order including summary / skills / custom sections. */
  order: SectionOrderToken[];
  /** True if the section/value should be visible. Persistent across renders. */
  visibility: { summary: boolean; skills: boolean };
}

let __idCounter = 0;
export const newId = (prefix = "id") => {
  __idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${__idCounter}`;
};

const compact = (values: Array<string | null | undefined>) =>
  values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean) as string[];

/**
 * Build the editable resume from:
 *  - the original ResumeStructure (source of truth for header / order)
 *  - the AI tailored output (only updates summary text + bullet wording + skill order)
 *  - the user's profile (used ONLY as a fallback if the parsed header is missing fields)
 */
export function buildEditableResume(
  structure: ResumeStructure,
  tailored: TailoredResumeData | null,
  profile: any | null | undefined,
): EditableResume {
  // Header — always from the parsed resume; fall back to the profile.
  const fullName =
    structure.header?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    compact([profile?.first_name, profile?.last_name]).join(" ") ||
    "Your Name";

  const contactParts =
    structure.header?.contact_details?.length
      ? structure.header.contact_details
      : compact([
          profile?.contact_email || profile?.email,
          profile?.phone,
          profile?.location || compact([profile?.city, profile?.state]).join(", "),
          profile?.linkedin_url,
          profile?.github_url,
          profile?.portfolio_url,
        ]);

  const contact_line = contactParts.filter(Boolean).join(" • ");

  // Summary — tailored text if present, else the original.
  const summary = tailored?.summary ?? structure.summary ?? "";
  const summary_original = tailored?.summary_original ?? structure.summary ?? "";
  const summary_changed = !!tailored?.summary_changed;

  // Skills — tailored order if present, else original. Deduplicate (case-insensitive) keeping first occurrence.
  const rawSkills = (tailored?.skills?.length ? tailored.skills : structure.skills) || [];
  const seenSkill = new Set<string>();
  const skills: string[] = [];
  for (const s of rawSkills) {
    const k = String(s || "").toLowerCase().trim();
    if (!k || seenSkill.has(k)) continue;
    seenSkill.add(k);
    skills.push(String(s));
  }

  // Sections — preserve EXACT order from the original structure, but filter out
  // any "skills" / "summary" sections (those are rendered separately to avoid duplicates).
  const tailoredSections = tailored?.sections || [];
  const isSpecialTitle = (t: string) => /^(skills?|technical skills?|core skills?|summary|profile|objective)$/i.test((t || "").trim());

  const sections: ResumeSection[] = (structure.sections || [])
    .map((origSec, sIdx): ResumeSection | null => {
      if (isSpecialTitle(origSec.title || "")) return null;
      const tailoredSec = tailoredSections[sIdx];
      const items: ResumeItem[] = (origSec.items || []).map((origItem: ResumeStructureItem, iIdx) => {
        const tailoredItem = tailoredSec?.items?.[iIdx];
        const origBullets = origItem.bullets || [];

        const bullets: ResumeBullet[] = origBullets.map((origText, bIdx) => {
          const tb = tailoredItem?.bullets?.[bIdx];
          if (tb) {
            return {
              id: newId("bul"),
              text: tb.text || origText,
              original: tb.original ?? origText,
              changed: !!tb.changed,
            };
          }
          return { id: newId("bul"), text: origText, original: origText, changed: false };
        });

        return {
          id: newId("item"),
          heading: origItem.heading || "",
          subheading: origItem.subheading || "",
          date: origItem.date || "",
          bullets,
        };
      });

      return {
        id: newId("sec"),
        key: "custom",
        title: origSec.title || "Section",
        visible: true,
        items,
        fromResume: true,
      };
    })
    .filter((s): s is ResumeSection => s !== null);

  // Build render order using extracted section_order. Tokens reference custom
  // sections by id so renames don't break ordering. Unknown tokens are skipped;
  // any sections/specials missing from the order are appended at the end.
  const order: SectionOrderToken[] = [];
  const used = { summary: false, skills: false, sectionIds: new Set<string>() };
  const titleToSection = new Map<string, ResumeSection>();
  for (const s of sections) titleToSection.set((s.title || "").toLowerCase().trim(), s);

  const rawOrder = structure.section_order || [];
  for (const token of rawOrder) {
    const t = String(token || "").toLowerCase().trim();
    if (!t) continue;
    if (t === "summary" && !used.summary) {
      order.push("summary");
      used.summary = true;
      continue;
    }
    if (t === "skills" && !used.skills) {
      order.push("skills");
      used.skills = true;
      continue;
    }
    const sec = titleToSection.get(t);
    if (sec && !used.sectionIds.has(sec.id)) {
      order.push({ kind: "custom", sectionId: sec.id });
      used.sectionIds.add(sec.id);
    }
  }
  // Append anything missing (defensive — keeps Summary/Skills first if order absent).
  if (!used.summary) order.unshift("summary");
  if (!used.skills) {
    // place skills right after summary if summary was prepended
    const idx = order.indexOf("summary");
    order.splice(idx + 1, 0, "skills");
  }
  for (const s of sections) {
    if (!used.sectionIds.has(s.id)) order.push({ kind: "custom", sectionId: s.id });
  }

  return {
    header: { full_name: fullName, contact_line },
    summary,
    summary_original,
    summary_changed,
    skills,
    sections,
    order,
    visibility: {
      summary: !!(summary && summary.trim()),
      skills: skills.length > 0,
    },
  };
}

/**
 * Used for live keyword highlighting in the editor preview.
 *
 * Strategy: highlight only HIGH-SIGNAL terms — never common English words.
 *  1. Every explicit job_skill (already curated by ingestion).
 *  2. Capitalized multi-word phrases lifted from the job description
 *     (likely tools, platforms, proper nouns — e.g. "Power BI", "Snowflake").
 *  3. Single tokens are kept ONLY if they're at least 4 chars AND not in the
 *     stop-word list AND look like a tech term (mixed case, acronym, or
 *     contain a digit / + / # / . — e.g. "C++", "k8s", "Node.js").
 */
const KEYWORD_STOP_WORDS = new Set([
  "through","across","within","between","during","because","without","including",
  "intelligence","synchronization","experience","experienced","working","knowledge",
  "ability","strong","excellent","proven","ensure","support","provide","develop",
  "developing","developed","build","building","built","create","created","creating",
  "manage","managing","managed","lead","leading","help","helping","work","working",
  "team","teams","role","roles","skills","skill","year","years","month","months",
  "company","companies","client","clients","customer","customers","product","products",
  "service","services","project","projects","business","technical","professional",
  "responsibilities","requirements","qualifications","preferred","required","candidate",
  "candidates","opportunity","opportunities","environment","solution","solutions",
  "platform","platforms","system","systems","application","applications","software",
  "process","processes","data","information","internal","external","global","across",
  "junior","senior","mid","entry","level","fulltime","parttime","remote","hybrid",
  "onsite","office","based","united","states","india","europe","america",
  "must","should","will","would","could","have","been","with","that","this","they",
  "their","them","there","than","also","more","most","other","such","into","from",
  "about","over","under","each","every","any","all","both","some","what","when",
  "where","while","whether","using","used","new","good","great","best","high","top",
]);

export function extractKeywords(jobDescription: string, jobSkills: string[]): string[] {
  const out = new Set<string>();

  // 1. Curated skills (already vetted by ingestion).
  for (const s of jobSkills || []) {
    const t = (s || "").trim();
    if (t.length >= 2) out.add(t.toLowerCase());
  }

  const desc = jobDescription || "";

  // 2. Capitalized multi-word phrases (proper nouns / product names).
  const phraseRe = /\b([A-Z][a-zA-Z0-9+.#-]*(?:\s+[A-Z][a-zA-Z0-9+.#-]*){1,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(desc)) !== null) {
    const phrase = m[1].trim();
    if (phrase.length >= 4) out.add(phrase.toLowerCase());
  }

  // 3. Single high-signal tokens — be strict.
  const tokenRe = /\b([A-Za-z][A-Za-z0-9+#.-]{2,})\b/g;
  while ((m = tokenRe.exec(desc)) !== null) {
    const raw = m[1];
    if (raw.length < 4) continue;
    const lower = raw.toLowerCase();
    if (KEYWORD_STOP_WORDS.has(lower)) continue;
    const looksTech =
      /[A-Z].*[a-z].*[A-Z]/.test(raw) || // CamelCase (e.g. JavaScript)
      /^[A-Z]{2,}$/.test(raw) ||         // ACRONYM (SQL, AWS, REST)
      /[0-9+#.]/.test(raw);              // contains digit/+/#/. (C++, k8s, Node.js)
    if (!looksTech) continue;
    out.add(lower);
  }

  return [...out].slice(0, 60);
}

/** Sanitize a filename segment. */
export function sanitizeFilenamePart(value: string) {
  return (value || "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "Untitled";
}

/**
 * FirstName_LastName_CompanyName_RoleName.ext
 * (Per spec: company before role, no dates / no version numbers / no AI labels.)
 */
export function buildResumeFilename(
  fullName: string,
  jobTitle: string,
  company: string,
  ext: "pdf" | "docx" | "txt",
) {
  const parts = (fullName || "").trim().split(/\s+/);
  const first = sanitizeFilenamePart(parts[0] || "Resume");
  const last = sanitizeFilenamePart(parts.slice(1).join(" ") || "");
  const co = sanitizeFilenamePart(company || "Company");
  const role = sanitizeFilenamePart(jobTitle || "Role");
  const name = [first, last, co, role].filter(Boolean).join("_");
  return `${name}.${ext}`;
}

/** Convert structured editable resume to plain text (for clipboard). */
export function resumeToPlainText(resume: EditableResume): string {
  const lines: string[] = [];
  lines.push(resume.header.full_name);
  if (resume.header.contact_line) lines.push(resume.header.contact_line);
  lines.push("");

  const sectionsById = new Map(resume.sections.map((s) => [s.id, s]));

  for (const tok of resume.order || []) {
    if (tok === "summary") {
      if (resume.visibility.summary && resume.summary?.trim()) {
        lines.push("SUMMARY");
        lines.push(stripHtml(resume.summary).trim());
        lines.push("");
      }
      continue;
    }
    if (tok === "skills") {
      if (resume.visibility.skills && resume.skills.length) {
        lines.push("SKILLS");
        lines.push(resume.skills.join(" • "));
        lines.push("");
      }
      continue;
    }
    const section = sectionsById.get(tok.sectionId);
    if (!section || !section.visible || !section.items.length) continue;
    lines.push(section.title.toUpperCase());
    for (const item of section.items) {
      const headerLine = [item.heading, item.subheading].filter(Boolean).join(" — ");
      const dateLine = item.date ? `   ${item.date}` : "";
      lines.push(headerLine + dateLine);
      for (const b of item.bullets) {
        const t = stripHtml(b.text).trim();
        if (t) lines.push(`  • ${t}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    // Strip preview-only highlight wrappers (keyword + change) keeping inner text.
    .replace(/<mark\b[^>]*data-(?:kw|chg)[^>]*>([\s\S]*?)<\/mark>/gi, "$1")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>(?!\n)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Convenience: count tailoring changes still present in the editable resume. */
export function countActiveChanges(resume: EditableResume | null): number {
  if (!resume) return 0;
  let n = resume.summary_changed && resume.summary?.trim() === (resume.summary_original ?? "").trim()
    ? 0 // user reverted summary
    : (resume.summary_changed ? 1 : 0);
  for (const s of resume.sections) {
    for (const it of s.items) {
      for (const b of it.bullets) {
        if (b.changed) n += 1;
      }
    }
  }
  return n;
}
