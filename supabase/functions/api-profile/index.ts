import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return structured profile with empty defaults instead of null
    const educationRaw = profile.education;
    const education = Array.isArray(educationRaw) ? educationRaw : [];
    const workExperienceRaw = profile.work_experience;
    const workExperience = Array.isArray(workExperienceRaw) ? workExperienceRaw : [];
    const certificationsRaw = profile.certifications;
    const certifications = Array.isArray(certificationsRaw) ? certificationsRaw : [];

    const structured = {
      user: { id: user.id, email: user.email || "" },
      profile: {
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        full_name: profile.full_name || "",
        account_email: profile.email || user.email || "",
        contact_email: profile.contact_email || profile.email || user.email || "",
        email: profile.contact_email || profile.email || user.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip: profile.zip || "",
        location: profile.location || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: profile.github_url || "",
        portfolio_url: profile.portfolio_url || "",
        work_authorization: profile.work_authorization || "",
        visa_status: profile.visa_status || "",
        experience_years: profile.experience_years ?? 0,
        current_company: profile.current_company || "",
        current_title: profile.current_title || "",
        skills: profile.skills || [],
        work_experience: workExperience.map((w: any) => ({
          title: w.title || "",
          company: w.company || "",
          start_date: w.start_date || "",
          end_date: w.end_date || "",
          is_current: w.is_current || false,
        })),
        education: education.map((e: any) => ({
          school: e.school || "",
          degree: e.degree || "",
          major: e.major || "",
          graduation_year: e.graduation_year || "",
        })),
        certifications: certifications.map((c: any) => ({
          name: c.name || "",
          issuer: c.issuer || "",
          date_obtained: c.date_obtained || "",
          expiration_date: c.expiration_date || "",
        })),
        resume_url: profile.resume_url || "",
        resume_filename: profile.resume_filename || "",
        is_premium: profile.is_premium || false,
        gender: profile.gender || "",
        race_ethnicity: profile.race_ethnicity || "",
        hispanic_latino: profile.hispanic_latino || "",
        veteran_status: profile.veteran_status || "",
        disability_status: profile.disability_status || "",
        military_service: profile.military_service || "",
      },
    };

    return new Response(JSON.stringify(structured), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
