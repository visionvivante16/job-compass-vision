import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { job_description, job_title, job_skills, profile } = await req.json();

    if (!job_description && !job_title) {
      return new Response(JSON.stringify({ error: "job_description or job_title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a profile summary for the AI
    const profileSummary = [
      profile.skills?.length ? `Skills: ${profile.skills.join(", ")}` : "",
      profile.experience_years ? `Years of experience: ${profile.experience_years}` : "",
      profile.current_title ? `Current role: ${profile.current_title}` : "",
      profile.current_company ? `Current company: ${profile.current_company}` : "",
      profile.work_experience?.length
        ? `Work history: ${profile.work_experience.map((w: any) => `${w.title} at ${w.company}`).join("; ")}`
        : "",
      profile.education?.length
        ? `Education: ${profile.education.map((e: any) => `${e.degree || ""} ${e.major || ""} at ${e.school}`).join("; ")}`
        : "",
      profile.certifications?.length
        ? `Certifications: ${profile.certifications.map((c: any) => c.name).join(", ")}`
        : "",
    ].filter(Boolean).join("\n");

    const jobSummary = [
      job_title ? `Job Title: ${job_title}` : "",
      job_skills?.length ? `Required Skills: ${job_skills.join(", ")}` : "",
      `Job Description:\n${job_description || "Not provided"}`,
    ].filter(Boolean).join("\n");

    const extractionTool = {
      type: "function",
      function: {
        name: "ats_check_result",
        description: "Return a structured ATS compatibility analysis comparing a candidate's profile against a job description.",
        parameters: {
          type: "object",
          properties: {
            overall_score: {
              type: "integer",
              description: "Overall ATS match score from 0-100",
            },
            keyword_match_score: {
              type: "integer",
              description: "Score for keyword matching 0-100",
            },
            experience_match_score: {
              type: "integer",
              description: "Score for experience level match 0-100",
            },
            skills_match_score: {
              type: "integer",
              description: "Score for skills alignment 0-100",
            },
            education_match_score: {
              type: "integer",
              description: "Score for education match 0-100",
            },
            matched_keywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords/skills from the job that match the candidate's profile",
            },
            missing_keywords: {
              type: "array",
              items: { type: "string" },
              description: "Important keywords/skills from the job NOT found in the candidate's profile",
            },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "3-5 specific strengths the candidate has for this role",
            },
            improvements: {
              type: "array",
              items: { type: "string" },
              description: "3-5 actionable suggestions to improve ATS compatibility",
            },
            verdict: {
              type: "string",
              enum: ["strong_match", "good_match", "moderate_match", "weak_match"],
              description: "Overall verdict category",
            },
            summary: {
              type: "string",
              description: "A 2-3 sentence summary of the ATS analysis",
            },
          },
          required: [
            "overall_score", "keyword_match_score", "experience_match_score",
            "skills_match_score", "education_match_score", "matched_keywords",
            "missing_keywords", "strengths", "improvements", "verdict", "summary",
          ],
          additionalProperties: false,
        },
      },
    };

    const messages = [
      {
        role: "system",
        content: `You are an expert ATS (Applicant Tracking System) analyzer. Your job is to compare a candidate's profile against a job description and provide an accurate, honest compatibility assessment.

Be precise and helpful:
- Score fairly — don't inflate scores. A 70 means good but not perfect.
- Identify SPECIFIC keywords from the job description that match or are missing.
- Provide ACTIONABLE improvement suggestions, not generic advice.
- Consider both hard skills (technologies, tools) and soft skills.
- Account for equivalent skills (e.g., "React" covers "React.js").
- Weight required skills higher than nice-to-haves.

You MUST call the ats_check_result function with your analysis. Do not respond with plain text.`,
      },
      {
        role: "user",
        content: `Analyze ATS compatibility:\n\n--- CANDIDATE PROFILE ---\n${profileSummary || "No profile data provided"}\n\n--- JOB POSTING ---\n${jobSummary}`,
      },
    ];

    const callModel = async (model: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            tools: [extractionTool],
            tool_choice: { type: "function", function: { name: "ats_check_result" } },
          }),
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "google/gemini-2.5-flash-lite"];
    let result: any = null;
    let lastError = "";

    for (const model of models) {
      try {
        const response = await callModel(model);

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const errorText = await response.text();
          console.error(`AI gateway error (${model}):`, response.status, errorText);
          lastError = `AI gateway error: ${response.status}`;
          continue;
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          try {
            result = JSON.parse(toolCall.function.arguments);
            console.log(`[ATS-CHECK] Success with model=${model}`);
            break;
          } catch (parseErr) {
            console.error(`[ATS-CHECK] JSON parse failed for ${model}:`, parseErr);
            lastError = "Failed to parse AI response";
            continue;
          }
        }

        // Fallback: try to parse plain text content as JSON
        const textContent = data.choices?.[0]?.message?.content;
        if (textContent) {
          const jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              result = JSON.parse(jsonMatch[0]);
              console.log(`[ATS-CHECK] Success via text fallback with model=${model}`);
              break;
            } catch {
              // continue to next model
            }
          }
        }

        console.warn(`[ATS-CHECK] No tool call from ${model}, retrying with next model`);
        lastError = "No structured result from AI";
      } catch (err) {
        console.error(`[ATS-CHECK] Exception with ${model}:`, err);
        lastError = err instanceof Error ? err.message : "Unknown error";
      }
    }

    if (!result) {
      return new Response(JSON.stringify({ error: lastError || "ATS analysis temporarily unavailable. Please try again." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ats-check error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
