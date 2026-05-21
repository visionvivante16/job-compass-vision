import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stripMarkdownJson = (value: string) => {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
};

const contentToText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part: any) => typeof part === "string" ? part : (part?.text || part?.content || "")).join("\n");
  }
  return "";
};

const parseResumeOutput = (result: any) => {
  const message = result?.choices?.[0]?.message;
  const toolArgs = message?.tool_calls?.[0]?.function?.arguments;
  const raw = typeof toolArgs === "string" ? toolArgs : contentToText(message?.content);
  if (!raw) throw new Error("AI response missing structured content");
  const parsed = JSON.parse(stripMarkdownJson(raw));
  if (!parsed || !Array.isArray(parsed.sections)) throw new Error("AI returned invalid resume shape");
  return parsed;
};

/**
 * NEW CONTRACT (preserve original structure):
 *
 * Request body:
 * {
 *   job_title: string,
 *   job_description: string,
 *   job_skills: string[],
 *   resume_structure: {
 *     header: { full_name: string, contact_details: string[] },
 *     summary?: string,
 *     skills: string[],
 *     sections: Array<{
 *       title: string,
 *       items: Array<{
 *         heading: string,
 *         subheading?: string,
 *         date?: string,
 *         bullets: string[],
 *       }>,
 *     }>,
 *   }
 * }
 *
 * Response: same shape, but:
 *  - summary may be rewritten (return both `summary` and `summary_original`)
 *  - skills array reordered (matching ones first); same skills, no additions
 *  - sections preserved in same order, same titles
 *  - items preserved in same order, with EXACT same heading / subheading / date
 *  - bullets preserved in same order and same count, each as
 *      { text: string, original: string, changed: boolean }
 *  - keywords_added: string[]  (just for stats)
 *  - changes_count: number     (number of bullets/summary modified)
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_title, job_description, job_skills, company_name, resume_structure, previous_result } = body;

    if (!job_title) {
      return new Response(JSON.stringify({ error: "job_title is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resume_structure || !resume_structure.sections) {
      return new Response(JSON.stringify({ error: "Please upload your resume in Profile Settings to get started." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("[TAILOR] Job:", job_title, "| sections:", resume_structure.sections?.length);

    const systemPrompt = `You are an expert resume writer and career coach with 15 years of experience helping candidates land jobs at top companies. Your task is to tailor an existing resume specifically for a job description.

STRICT RULES — follow every single one:

1. PRESERVE THE ORIGINAL RESUME STRUCTURE COMPLETELY
   - Keep every section in the exact same order as the original
   - Keep the same number of bullet points per job role
   - Never add new sections that did not exist in the original
   - Never remove sections that existed in the original
   - Never change company names, job titles, dates, or education details

2. REWRITE BULLET POINTS TO MATCH THE JOB
   - Read the job description carefully and identify the top 8-10 keywords and required skills
   - Rewrite each bullet point to naturally incorporate these keywords
   - Every bullet point must start with a strong action verb
   - Every bullet point must include a quantifiable achievement where possible — numbers, percentages, dollar amounts
   - Never write vague bullets like "Worked on various projects" — be specific
   - Each bullet must be one line maximum — no wrapping

3. REWRITE THE SUMMARY
   - Mention the specific job title from the job description
   - Mention the specific company name
   - Highlight the candidate's most relevant experience for this specific role
   - Maximum 2-3 sentences — punchy and specific
   - Never use clichés like results-driven, passionate, detail-oriented

4. OPTIMIZE SKILLS SECTION
   - Reorder skills so that EVERY skill appearing in the job description (frameworks, languages, tools, platforms) appears at the very BEGINNING of the skills list — not buried in the middle
   - Remove skills that are clearly irrelevant to this role (e.g. for a web engineering role remove IoT, Arduino, Raspberry Pi, hardware-only skills; for a data role remove unrelated frontend frameworks)
   - You MAY add 2-5 new highly relevant skills explicitly mentioned in the job description that the candidate likely has based on their experience

5. KEYWORD MATCHING — CRITICAL:
   Before rewriting any bullet point, first extract ALL technical keywords from the job description into a list. Then for each bullet point ask yourself: which of these keywords can I naturally incorporate into this bullet?

   Priority keywords to match first — always include these if the job mentions them:
   - Specific frameworks and languages mentioned (Next.js, TypeScript, Supabase, Node.js etc)
   - Specific tools mentioned (n8n, Salesforce, Vapi, GitHub Actions etc)
   - Specific patterns mentioned (multi-tenant, RBAC, real-time, webhooks etc)

   If the candidate has used similar technology — map it. For example:
   - Candidate used "Express.js" → job needs "Node.js" → rewrite to emphasise Node.js
   - Candidate used "Jenkins CI/CD" → job needs "GitHub Actions" → mention both
   - Candidate used "MongoDB" → job needs "PostgreSQL" → rewrite to show database expertise broadly

   The goal is maximum keyword overlap between the resume and job description while keeping everything truthful and natural.

6. QUALITY STANDARDS
   - Every sentence must be specific not generic
   - The resume must read like it was written by a human career expert not AI
   - A hiring manager reading this resume should immediately see why this candidate is perfect for this specific role
   - The ATS match score should be 85% or higher after tailoring

7. OUTPUT FORMAT
   - Return the complete tailored resume as structured JSON preserving the exact same sections and structure as the input
   - Do not add any explanation or commentary — only return the JSON
   - Maintain all original formatting spacing and section headers exactly as they appeared in the original`;

    const originalResumeText = JSON.stringify({
      header: resume_structure.header,
      summary: resume_structure.summary || "",
      skills: resume_structure.skills || [],
      sections: resume_structure.sections || [],
    }, null, 2);

    const userMessage = `Here is the candidate's original resume:\n${originalResumeText}\n\nHere is the job description to tailor for:\nJob Title: ${job_title}\nCompany: ${company_name || ""}\nFull Description: ${(job_description || "").slice(0, 4000)}\n\nTailor this resume for this specific role following all the rules above. Return only the tailored resume JSON nothing else.`;

    // Send a compact JSON of the structure so the AI can faithfully echo it back.
    const userPayload = {
      target_job_title: job_title,
      target_job_skills: (job_skills || []).slice(0, 30),
      target_job_description: (job_description || "").slice(0, 2500),
      prior_tailored_version: previous_result
        ? {
            summary: previous_result.summary || "",
            skills: Array.isArray(previous_result.skills) ? previous_result.skills.slice(0, 80) : [],
            sections: Array.isArray(previous_result.sections)
              ? previous_result.sections.map((section: any) => ({
                  title: section.title,
                  items: Array.isArray(section.items)
                    ? section.items.map((item: any) => ({
                        heading: item.heading || "",
                        subheading: item.subheading || "",
                        date: item.date || "",
                        bullets: Array.isArray(item.bullets)
                          ? item.bullets.map((bullet: any) => bullet?.text || "")
                          : [],
                      }))
                    : [],
                }))
              : [],
          }
        : null,
      resume: {
        header: resume_structure.header,
        summary: resume_structure.summary || "",
        skills: (resume_structure.skills || []).slice(0, 80),
        sections: (resume_structure.sections || []).map((s: any) => ({
          title: s.title,
          items: (s.items || []).map((it: any) => ({
            heading: it.heading || "",
            subheading: it.subheading || "",
            date: it.date || "",
            bullets: (it.bullets || []).map((b: any) =>
              typeof b === "string" ? b : (b?.text || ""),
            ),
          })),
        })),
      },
    };

    const toolDef = {
      type: "function",
      function: {
        name: "return_tailored_resume",
        description: "Return the same resume structure with minimal wording rewrites.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            summary_changed: { type: "boolean" },
            skills: { type: "array", items: { type: "string" } },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string" },
                        subheading: { type: "string" },
                        date: { type: "string" },
                        bullets: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              text: { type: "string" },
                              changed: { type: "boolean" },
                            },
                            required: ["text", "changed"],
                          },
                        },
                      },
                      required: ["heading", "bullets"],
                    },
                  },
                },
                required: ["title", "items"],
              },
            },
            keywords_added: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "summary_changed", "skills", "sections", "keywords_added"],
        },
      },
    };

    const models = ["openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5.2"];
    const maxRetries = 2;
    let response: Response | null = null;
    let lastError = "";
    let aiOutput: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const model = models[Math.min(attempt, models.length - 1)];
      console.log(`[TAILOR] Attempt ${attempt + 1} model=${model}`);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            ...(model.startsWith("openai/gpt-5")
              ? { max_completion_tokens: 6000 }
              : { max_tokens: 3000, temperature: 0.3 }),
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            ...(model.startsWith("openai/")
              ? { response_format: { type: "json_object" } }
              : {
                  tools: [toolDef],
                  tool_choice: { type: "function", function: { name: "return_tailored_resume" } },
                }),
          }),
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI service is temporarily unavailable. Please try again later." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.ok) {
          // Parse and validate the AI output here so we can retry with the next model if needed.
          try {
            const result = await response.json();
            const finishReason = result.choices?.[0]?.finish_reason || result.choices?.[0]?.finishReason || "unknown";
            aiOutput = parseResumeOutput(result);
            console.log(`[TAILOR] Attempt ${attempt + 1} parsed output finish=${finishReason}`);
            break;
          } catch (e: any) {
            aiOutput = null;
            lastError = e?.message || "Failed to parse AI response body";
          }
          console.error(`[TAILOR] Attempt ${attempt + 1} bad output: ${lastError}`);
          response = null;
          if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        lastError = await response.text();
        console.error(`[TAILOR] Attempt ${attempt + 1} failed (status ${response.status}):`, lastError.slice(0, 300));
        response = null;
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      } catch (fetchErr: any) {
        const isAbort = fetchErr?.name === "AbortError";
        lastError = isAbort ? "AI request timed out" : (fetchErr?.message || "Network error");
        console.error(`[TAILOR] Attempt ${attempt + 1} ${isAbort ? "timeout" : "error"}:`, lastError);
        response = null;
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }

    if (!aiOutput) {
      console.error("[TAILOR] All attempts failed. Last error:", lastError.slice(0, 200));
      return new Response(JSON.stringify({ error: "Resume tailoring is temporarily unavailable. Please try again in a moment." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───── ENFORCE STRUCTURE INTEGRITY ─────
    // Even if the model strays, we forcibly reconcile the AI output with the
    // original structure so headings / dates / counts can never drift.
    const original = resume_structure;
    const aiSections: any[] = Array.isArray(aiOutput.sections) ? aiOutput.sections : [];

    let changesCount = 0;
    const safeSections = (original.sections || []).map((origSec: any, sIdx: number) => {
      const aiSec = aiSections[sIdx] || {};
      const aiItems: any[] = Array.isArray(aiSec.items) ? aiSec.items : [];
      const isEducation = /education/i.test(origSec.title || "");

      return {
        title: origSec.title, // never let AI rename sections
        items: (origSec.items || []).map((origItem: any, iIdx: number) => {
          const aiItem = aiItems[iIdx] || {};
          const origBullets: string[] = (origItem.bullets || []).map((b: any) =>
            typeof b === "string" ? b : (b?.text || ""),
          );
          const aiBullets: any[] = Array.isArray(aiItem.bullets) ? aiItem.bullets : [];

          const bullets = origBullets.map((origText, bIdx) => {
            // Education or contact-ish sections: pass through verbatim, never count as changed
            if (isEducation) {
              return { text: origText, original: origText, changed: false };
            }
            const aiB = aiBullets[bIdx];
            const newText = (aiB && typeof aiB.text === "string" && aiB.text.trim())
              ? aiB.text
              : origText;
            const changed = newText.trim() !== origText.trim();
            if (changed) changesCount++;
            return { text: newText, original: origText, changed };
          });

          return {
            heading: origItem.heading || "",   // preserved verbatim
            subheading: origItem.subheading || "",
            date: origItem.date || "",
            bullets,
          };
        }),
      };
    });

    // Skills: trust AI-provided ordering AND pruning. Dedupe case-insensitively.
    // We allow AI to drop irrelevant originals and add new ones from job description.
    const origSkills: string[] = (original.skills || []).map((s: string) => String(s));
    let safeSkills = origSkills;
    if (Array.isArray(aiOutput.skills) && aiOutput.skills.length > 0) {
      const seen = new Set<string>();
      const reordered: string[] = [];
      for (const s of aiOutput.skills) {
        const raw = String(s || "").trim();
        const key = raw.toLowerCase();
        if (!raw || seen.has(key)) continue;
        seen.add(key);
        reordered.push(raw);
      }
      safeSkills = reordered.slice(0, 40);
    } else {
      // Fallback: just dedupe originals
      const seen = new Set<string>();
      safeSkills = origSkills.filter((s) => {
        const k = s.toLowerCase().trim();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    // Summary: keep the AI rewrite (only rewording is allowed)
    const origSummary = String(original.summary || "");
    const newSummary = typeof aiOutput.summary === "string" && aiOutput.summary.trim()
      ? aiOutput.summary
      : origSummary;
    const summaryChanged = !!origSummary && newSummary.trim() !== origSummary.trim();
    if (summaryChanged) changesCount++;

    const tailored = {
      header: original.header, // never let AI touch this
      summary: newSummary,
      summary_original: origSummary,
      summary_changed: summaryChanged,
      skills: safeSkills,
      sections: safeSections,
      keywords_added: Array.isArray(aiOutput.keywords_added) ? aiOutput.keywords_added.slice(0, 25) : [],
      changes_count: changesCount,
    };

    console.log("[TAILOR] Done. Changes:", changesCount, "| sections:", safeSections.length);

    return new Response(JSON.stringify(tailored), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[TAILOR] Unhandled error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
