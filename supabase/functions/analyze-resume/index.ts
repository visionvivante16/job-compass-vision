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

    const { resume_text, skills, work_experience, education, current_title, experience_years } = await req.json();

    if (!resume_text && !skills?.length) {
      return new Response(JSON.stringify({ error: "resume_text or skills required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a profile summary for the AI to analyze
    const profileContext = [
      resume_text ? `Resume Text:\n${resume_text}` : "",
      current_title ? `Current Title: ${current_title}` : "",
      experience_years ? `Years of Experience: ${experience_years}` : "",
      skills?.length ? `Skills: ${skills.join(", ")}` : "",
      work_experience?.length ? `Work Experience:\n${JSON.stringify(work_experience)}` : "",
      education?.length ? `Education:\n${JSON.stringify(education)}` : "",
    ].filter(Boolean).join("\n\n");

    const intelligenceTool = {
      type: "function",
      function: {
        name: "save_resume_intelligence",
        description: "Save structured career intelligence extracted from the user's resume and profile data.",
        parameters: {
          type: "object",
          properties: {
            primaryRole: { type: "string", description: "The user's primary job role/title, e.g. 'Full Stack Developer'" },
            primaryStack: { type: "array", items: { type: "string" }, description: "Primary technology stack, e.g. ['React', 'Node.js', 'PostgreSQL']" },
            experienceLevel: { type: "string", enum: ["fresher", "junior", "mid", "senior", "lead"], description: "Career experience level" },
            yearsOfExperience: { type: "number", description: "Total years of professional experience" },
            topSkills: { type: "array", items: { type: "string" }, description: "Top 10 strongest skills" },
            secondarySkills: { type: "array", items: { type: "string" }, description: "Secondary/supporting skills" },
            education: {
              type: "object",
              properties: {
                degree: { type: "string" },
                field: { type: "string" },
                isInternational: { type: "boolean", description: "Whether education is from outside the US" },
                visaStatus: { type: "string", enum: ["citizen", "greencard", "h1b", "opt", "stemopt", "f1", "other", "unknown"] },
              },
            },
            currentDomain: { type: "string", description: "Current industry domain, e.g. 'FinTech', 'Healthcare'" },
            openToDomains: { type: "array", items: { type: "string" }, description: "Domains the user could transition to" },
            careerTrajectory: { type: "string", description: "Brief career trajectory summary in one sentence" },
            jobTitlesToTarget: { type: "array", items: { type: "string" }, description: "Job titles this person should target" },
            salaryRange: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
                currency: { type: "string" },
              },
            },
            locationPreference: { type: "array", items: { type: "string" }, description: "Preferred work locations based on profile" },
            strengthSummary: { type: "string", description: "2-3 sentence summary of the candidate's strengths" },
            improvementAreas: { type: "array", items: { type: "string" }, description: "Skills or areas to improve" },
            uniqueSellingPoint: { type: "string", description: "What makes this candidate stand out" },
          },
          required: ["primaryRole", "primaryStack", "experienceLevel", "topSkills", "jobTitlesToTarget", "strengthSummary"],
          additionalProperties: false,
        },
      },
    };

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
            content: `You are a career intelligence engine. Analyze the user's resume/profile data deeply and extract structured career intelligence. Be accurate and realistic — do not exaggerate or fabricate information. For visa status, only mark as a specific status if clearly indicated; otherwise use "unknown". For salary ranges, estimate based on the role, experience level, and US market rates. For experience level: fresher (0-1 yr), junior (1-3 yr), mid (3-6 yr), senior (6-10 yr), lead (10+ yr).`,
          },
          {
            role: "user",
            content: `Analyze this candidate's profile and extract comprehensive career intelligence:\n\n${profileContext}`,
          },
        ],
        tools: [intelligenceTool],
        tool_choice: { type: "function", function: { name: "save_resume_intelligence" } },
      }),
    });

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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No intelligence result from AI");
    }

    const intelligence = JSON.parse(toolCall.function.arguments);

    // Save to profile
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({ resume_intelligence: intelligence })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to save intelligence:", updateError);
      throw new Error("Failed to save resume intelligence");
    }

    return new Response(JSON.stringify({ intelligence }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
