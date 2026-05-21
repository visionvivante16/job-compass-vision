import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user context from profile
    let profileContext = "";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "first_name, last_name, current_title, current_company, skills, experience_years, education, work_experience, certifications, location, work_authorization, visa_status"
        )
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const parts: string[] = [];
        if (profile.first_name)
          parts.push(`Name: ${profile.first_name} ${profile.last_name || ""}`);
        if (profile.current_title)
          parts.push(`Current Role: ${profile.current_title}`);
        if (profile.current_company)
          parts.push(`Current Company: ${profile.current_company}`);
        if (profile.experience_years)
          parts.push(`Experience: ${profile.experience_years} years`);
        if (profile.skills?.length)
          parts.push(`Skills: ${profile.skills.join(", ")}`);
        if (profile.location) parts.push(`Location: ${profile.location}`);
        if (profile.work_authorization)
          parts.push(`Work Authorization: ${profile.work_authorization}`);
        if (profile.education) {
          const edu = Array.isArray(profile.education)
            ? profile.education
            : [];
          if (edu.length)
            parts.push(
              `Education: ${edu
                .map(
                  (e: any) =>
                    `${e.degree || ""} in ${e.major || ""} from ${
                      e.school || ""
                    }`
                )
                .join("; ")}`
            );
        }
        if (profile.work_experience) {
          const exp = Array.isArray(profile.work_experience)
            ? profile.work_experience
            : [];
          if (exp.length)
            parts.push(
              `Work History: ${exp
                .map(
                  (w: any) =>
                    `${w.title || ""} at ${w.company || ""} (${
                      w.start_date || ""
                    } - ${w.is_current ? "Present" : w.end_date || ""})`
                )
                .join("; ")}`
            );
        }
        if (profile.certifications) {
          const certs = Array.isArray(profile.certifications)
            ? profile.certifications
            : [];
          if (certs.length)
            parts.push(
              `Certifications: ${certs
                .map((c: any) => c.name || "")
                .join(", ")}`
            );
        }
        profileContext = parts.join("\n");
      }
    }

    const { messages, jobContext, pageContext } = await req.json();

    const systemPrompt = `You are Socia AI, a premium career assistant for Sociax — a modern job search platform. You are helpful, warm, concise, and precise. Use ✦ sparingly for flair.

YOUR CAPABILITIES:
1. **Resume Review**: Analyze the user's profile/resume and give specific, actionable improvement suggestions (formatting, keywords, impact metrics, ATS optimization).
2. **Job Match Analysis**: Compare user skills/experience against a specific job listing and rate fit percentage with clear reasoning.
3. **Interview Preparation**: Generate role-specific interview questions with answer frameworks based on the user's background.
4. **Cover Letter Drafting**: Write tailored cover letters matching user profile to job requirements.
5. **Skill Gap Analysis**: Identify missing skills for their target roles and suggest learning paths.
6. **Salary Insights**: Provide salary range guidance based on role, location, and experience level.
7. **Career Coaching**: Offer strategic job search advice, networking tips, and career path guidance.

FORMATTING RULES (CRITICAL — follow these strictly):
- ALWAYS use **bullet points** (markdown *) for listing items, recommendations, skills, job matches, steps, or any enumerable information.
- Start with a brief 1-2 sentence personalized intro, then switch to structured bullet-point lists.
- Use **bold** for key terms, company names, skills, job titles, and locations.
- Group related bullets under **bold section headers** followed by a colon.
- Use numbered lists (1. 2. 3.) only for sequential steps or ranked items.
- NEVER write long paragraphs. Break everything into scannable bullet points.
- End with a **bold follow-up question** to keep the conversation going.
- Keep responses concise (2-4 sections max unless detailed analysis is requested).

EXAMPLE FORMAT:
Great question! Based on your profile, here's what I recommend: ✦

**Top Skills to Highlight:**
*   **React & TypeScript** — Most in-demand for your target roles
*   **AWS Certification** — Strong differentiator for cloud positions

**Suggested Next Steps:**
1.  Update your resume summary with quantified impact metrics
2.  Apply to roles matching your **SRE** background

**Would you like me to draft a tailored cover letter for any of these roles?** ✦

CONTENT RULES:
- When analyzing a resume/profile, be specific — mention exact skills, gaps, and improvements.
- When a job is provided, reference specific requirements from the job description.
- If asked something outside career/job scope, politely redirect to career topics.
- Never fabricate job listings or companies.
- Personalize every response using the user's actual profile data.

${
  profileContext
    ? `USER PROFILE:\n${profileContext}`
    : "USER PROFILE: Not yet set up. Encourage them to complete their profile for personalized advice."
}
${jobContext ? `\nCURRENT JOB BEING VIEWED:\n${jobContext}` : ""}
${pageContext ? `\nUSER IS ON PAGE: ${pageContext}` : ""}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add credits to continue.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("socia-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
