import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the user from the JWT
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      job_title,
      company,
      job_skills,
      job_description,
      user_name,
      user_title,
      user_skills,
      user_experience_years,
      user_education,
      user_work_experience,
      user_resume_intelligence,
    } = await req.json();

    if (!job_title || !company) {
      return new Response(
        JSON.stringify({ error: "job_title and company are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check and increment usage atomically (server-side enforcement)
    const { data: usageResult, error: usageError } = await supabase.rpc(
      "check_and_increment_linkedin_usage",
      { p_user_id: user.id, p_daily_limit: FREE_DAILY_LIMIT }
    );

    if (usageError) {
      console.error("Usage check error:", usageError);
      throw new Error("Failed to check usage limits");
    }

    if (!usageResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Daily limit reached. Upgrade to Premium for unlimited messages.",
          limit_reached: true,
          remaining: 0,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build rich context for the AI
    const profileParts: string[] = [];
    if (user_name) profileParts.push(`Name: ${user_name}`);
    if (user_title) profileParts.push(`Current role: ${user_title}`);
    if (user_experience_years) profileParts.push(`Years of experience: ${user_experience_years}`);
    if (user_skills?.length) profileParts.push(`Key skills: ${user_skills.slice(0, 10).join(", ")}`);
    if (user_education?.length) {
      const eduSummary = user_education
        .slice(0, 2)
        .map((e: any) => `${e.degree || ""} ${e.field || ""} from ${e.institution || ""}`.trim())
        .filter(Boolean)
        .join("; ");
      if (eduSummary) profileParts.push(`Education: ${eduSummary}`);
    }
    if (user_work_experience?.length) {
      const expSummary = user_work_experience
        .slice(0, 3)
        .map((e: any) => `${e.title || e.role || ""} at ${e.company || ""}`.trim())
        .filter(Boolean)
        .join("; ");
      if (expSummary) profileParts.push(`Work history: ${expSummary}`);
    }
    if (user_resume_intelligence) {
      const ri = user_resume_intelligence;
      if (ri.target_roles?.length) profileParts.push(`Target roles: ${ri.target_roles.slice(0, 3).join(", ")}`);
      if (ri.experience_level) profileParts.push(`Experience level: ${ri.experience_level}`);
      if (ri.strongest_skills?.length) profileParts.push(`Strongest skills: ${ri.strongest_skills.slice(0, 5).join(", ")}`);
    }

    const profileContext = profileParts.length > 0
      ? `\n\nSENDER'S PROFILE:\n${profileParts.join("\n")}`
      : "";

    const jobContext = [
      `Role: ${job_title} at ${company}`,
      job_skills?.length ? `Required skills: ${job_skills.slice(0, 8).join(", ")}` : "",
      job_description ? `Job summary: ${job_description.slice(0, 300)}` : "",
    ].filter(Boolean).join("\n");

    // Find overlapping skills
    const overlappingSkills: string[] = [];
    if (user_skills?.length && job_skills?.length) {
      const userSkillsLower = new Set(user_skills.map((s: string) => s.toLowerCase()));
      for (const js of job_skills) {
        if (userSkillsLower.has(js.toLowerCase())) overlappingSkills.push(js);
      }
    }

    const overlapHint = overlappingSkills.length > 0
      ? `\n\nSHARED SKILLS (mention 1-2 naturally): ${overlappingSkills.slice(0, 4).join(", ")}`
      : "";

    const systemPrompt = `You are an expert career networking coach. Generate a highly personalized LinkedIn connection request message.

RULES:
- MUST be under 280 characters (LinkedIn's limit is 300, keep buffer)
- Sound authentic, specific, and human — NOT template-like or generic
- Reference a SPECIFIC shared skill, experience, or mutual interest when possible
- Show genuine interest in their company or work
- Be concise — every word must earn its place
- End with a soft ask ("would love to connect" or "happy to chat")
- Do NOT use: "I came across your profile", "I noticed", "I hope this finds you well", or any filler
- Do NOT include quotation marks in the output
- Return ONLY the message text, nothing else`;

    const userPrompt = `Generate a LinkedIn connection message for someone at this company.

JOB DETAILS:
${jobContext}${profileContext}${overlapHint}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let message = data.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error("No message generated");

    message = message.replace(/^["']|["']$/g, "");

    return new Response(
      JSON.stringify({
        message,
        remaining: usageResult.remaining,
        is_premium: usageResult.is_premium,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-linkedin-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
