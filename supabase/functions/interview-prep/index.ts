import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { job_title, job_description, job_skills, resume_intelligence } = await req.json();

    if (!job_title || !job_description) {
      return new Response(JSON.stringify({ error: "Missing job details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasResume = resume_intelligence && resume_intelligence.primaryRole;

    const resumeContext = hasResume
      ? `\nCANDIDATE BACKGROUND (use to tailor answers, do NOT include analysis in output):\n- Role: ${resume_intelligence.primaryRole}\n- Experience: ${resume_intelligence.experienceLevel}, ${resume_intelligence.yearsOfExperience || "unknown"} years\n- Skills: ${(resume_intelligence.topSkills || []).join(", ")}\n- Domain: ${resume_intelligence.currentDomain || "N/A"}`
      : "";

    const systemPrompt = `You are an interview coach. Generate interview questions and tailored answers for a specific job. Output JSON only. Be concise.`;

    const userPrompt = `Job: ${job_title}
Skills: ${(job_skills || []).join(", ")}
Description (first 800 chars): ${job_description.slice(0, 800)}
${resumeContext}

Return JSON with questions and answers only. Keep answers 2-4 sentences each.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_interview_prep",
              description: "Return interview questions and answers",
              parameters: {
                type: "object",
                properties: {
                  technicalQuestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        suggestedAnswer: { type: "string" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                      },
                      required: ["question", "suggestedAnswer", "difficulty"],
                    },
                  },
                  behavioralQuestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        suggestedAnswer: { type: "string" },
                      },
                      required: ["question", "suggestedAnswer"],
                    },
                  },
                },
                required: ["technicalQuestions", "behavioralQuestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_interview_prep" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response");

    const prep = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ prep }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("interview-prep error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
