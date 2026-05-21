import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_LIMIT = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { jobId, jobTitle, company, jobDescription, jobSkills } = await req.json();
    if (!jobId || !jobTitle || !company) throw new Error("Missing job data");

    // Check premium status
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_premium, full_name, current_title, skills, resume_intelligence, work_experience, experience_years")
      .eq("user_id", user.id)
      .single();

    const isPremium = profileData?.is_premium === true;

    // Check usage for free users
    if (!isPremium) {
      const { count } = await supabase
        .from("cover_letters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) >= FREE_LIMIT) {
        return new Response(
          JSON.stringify({ error: "limit_reached", message: `Free users can generate up to ${FREE_LIMIT} cover letters. Upgrade to Premium for unlimited access.` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build context from profile
    const intel = profileData?.resume_intelligence as any;
    const userName = profileData?.full_name || "the applicant";
    const currentTitle = profileData?.current_title || intel?.primaryRole || "";
    const skills = profileData?.skills || intel?.topSkills || [];
    const experience = profileData?.experience_years || intel?.yearsOfExperience || "";
    const strengthSummary = intel?.strengthSummary || "";
    const usp = intel?.uniqueSellingPoint || "";

    const systemPrompt = `You are an expert career coach and cover letter writer. Generate a compelling, professional cover letter that stands out. The tone should be confident, specific, and personalized — not generic. 

Rules:
- Write in first person
- Keep it concise (300-400 words)
- Reference specific skills and experience that match the job
- Show enthusiasm for the company and role
- Include a strong opening hook and closing call-to-action
- Do NOT include addresses, dates, or "Dear Hiring Manager" headers — start directly with the content
- Use markdown formatting with paragraphs
- Make it feel authentic and human, not templated`;

    const userPrompt = `Generate an outstanding cover letter for this application:

**Job Title:** ${jobTitle}
**Company:** ${company}
**Job Description:** ${jobDescription || "Not provided"}
**Required Skills:** ${(jobSkills || []).join(", ") || "Not specified"}

**Applicant Profile:**
- Name: ${userName}
- Current Role: ${currentTitle}
- Years of Experience: ${experience}
- Key Skills: ${skills.join(", ")}
${strengthSummary ? `- Strength Summary: ${strengthSummary}` : ""}
${usp ? `- Unique Selling Point: ${usp}` : ""}

Write a cover letter that powerfully connects this applicant's background to the job requirements.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI service is temporarily unavailable. Please try again later." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "Cover letter generation failed. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    // Save to database
    const { data: saved, error: saveErr } = await supabase
      .from("cover_letters")
      .insert({ user_id: user.id, job_id: jobId, job_title: jobTitle, company, content })
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("Save error:", saveErr);
      // Still return the content even if save fails
    }

    // Get remaining count for free users
    let remaining: number | null = null;
    if (!isPremium) {
      const { count } = await supabase
        .from("cover_letters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      remaining = FREE_LIMIT - (count ?? 0);
    }

    return new Response(
      JSON.stringify({ content, id: saved?.id, remaining, isPremium }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
