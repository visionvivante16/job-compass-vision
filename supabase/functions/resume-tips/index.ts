import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { job_title, job_description, job_skills, resume_intelligence } = await req.json();

    if (!job_description || !resume_intelligence) {
      return new Response(JSON.stringify({ error: "job_description and resume_intelligence required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContext = [
      `Primary Role: ${resume_intelligence.primaryRole || "Unknown"}`,
      `Top Skills: ${(resume_intelligence.topSkills || []).join(", ")}`,
      `Experience Level: ${resume_intelligence.experienceLevel || "Unknown"}`,
      `Years: ${resume_intelligence.yearsOfExperience || "Unknown"}`,
      resume_intelligence.strengthSummary ? `Strengths: ${resume_intelligence.strengthSummary}` : "",
      resume_intelligence.improvementAreas?.length ? `Areas to improve: ${resume_intelligence.improvementAreas.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a career coach AI. Given a job description and a candidate's resume intelligence, generate exactly 3 specific, actionable tips to improve their chances of getting this specific job. Each tip should reference specific keywords/skills from the job description. Be concrete, not generic. Format tips with a 💡 emoji prefix.`,
          },
          {
            role: "user",
            content: `Job Title: ${job_title}\n\nJob Description:\n${job_description.substring(0, 3000)}\n\nRequired Skills: ${(job_skills || []).join(", ")}\n\nCandidate Profile:\n${userContext}\n\nGenerate 3 specific resume tips for THIS job.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_resume_tips",
            description: "Save 3 actionable resume tips for this specific job.",
            parameters: {
              type: "object",
              properties: {
                tips: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tip: { type: "string", description: "The actionable tip text" },
                      keyword: { type: "string", description: "The key skill/keyword this tip focuses on" },
                      occurrences: { type: "number", description: "How many times this keyword appears in the JD" },
                    },
                    required: ["tip", "keyword"],
                    additionalProperties: false,
                  },
                  minItems: 3,
                  maxItems: 3,
                },
              },
              required: ["tips"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_resume_tips" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tips result from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("resume-tips error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
