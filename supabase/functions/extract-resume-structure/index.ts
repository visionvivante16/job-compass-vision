import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * extract-resume-structure
 *
 * Downloads the user's uploaded resume file from the `resumes` storage bucket
 * and returns it as a structured object that preserves the original sections,
 * order, items, and bullet points. This structure becomes the single source of
 * truth for the Tailored Resume editor — the AI tailor only rewords its
 * contents without changing layout.
 *
 * Output shape:
 * {
 *   header: { full_name, contact_details: string[] },
 *   summary?: string,
 *   skills: string[],
 *   sections: Array<{
 *     title: string,
 *     items: Array<{
 *       heading: string,
 *       subheading?: string,
 *       date?: string,
 *       bullets: string[],
 *     }>
 *   }>,
 *   raw_text: string,
 * }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const td = new TextDecoder();
  let extracted = "";

  // Find End of Central Directory
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Not a valid DOCX (zip)");

  const cdOffset =
    bytes[eocdOffset + 16] |
    (bytes[eocdOffset + 17] << 8) |
    (bytes[eocdOffset + 18] << 16) |
    (bytes[eocdOffset + 19] << 24);
  const cdEntries = bytes[eocdOffset + 10] | (bytes[eocdOffset + 11] << 8);

  let pos = cdOffset;
  for (let i = 0; i < cdEntries && pos < bytes.length - 46; i++) {
    const sig = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
    if (sig !== 0x02014b50) break;

    const method = bytes[pos + 10] | (bytes[pos + 11] << 8);
    const compSize = bytes[pos + 20] | (bytes[pos + 21] << 8) | (bytes[pos + 22] << 16) | (bytes[pos + 23] << 24);
    const nameLen = bytes[pos + 28] | (bytes[pos + 29] << 8);
    const extraLen = bytes[pos + 30] | (bytes[pos + 31] << 8);
    const commentLen = bytes[pos + 32] | (bytes[pos + 33] << 8);
    const localOffset =
      bytes[pos + 42] |
      (bytes[pos + 43] << 8) |
      (bytes[pos + 44] << 16) |
      (bytes[pos + 45] << 24);
    const name = td.decode(bytes.slice(pos + 46, pos + 46 + nameLen));

    if (name === "word/document.xml") {
      const lhNameLen = bytes[localOffset + 26] | (bytes[localOffset + 27] << 8);
      const lhExtraLen = bytes[localOffset + 28] | (bytes[localOffset + 29] << 8);
      const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
      const rawData = bytes.slice(dataStart, dataStart + compSize);
      let xmlBytes: Uint8Array;
      if (method === 8) {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(rawData);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const total = chunks.reduce((a, c) => a + c.length, 0);
        xmlBytes = new Uint8Array(total);
        let p = 0;
        for (const c of chunks) { xmlBytes.set(c, p); p += c.length; }
      } else {
        xmlBytes = rawData;
      }
      const xml = td.decode(xmlBytes);
      const paragraphs = xml.split(/<\/w:p>/);
      for (const para of paragraphs) {
        const texts: string[] = [];
        const r = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let m;
        while ((m = r.exec(para)) !== null) texts.push(m[1]);
        if (texts.length > 0) extracted += texts.join("") + "\n";
      }
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }

  return extracted;
}

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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const { resume_path, filename, mime_type } = body;
    if (!resume_path) {
      return new Response(JSON.stringify({ error: "resume_path is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from the private `resumes` bucket using the service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // resume_path may be a full public-style URL or a storage path. Try to extract a key.
    let storageKey = resume_path;
    const marker = "/resumes/";
    const idx = resume_path.indexOf(marker);
    if (idx >= 0) storageKey = resume_path.substring(idx + marker.length);
    // Strip query string if any
    storageKey = storageKey.split("?")[0];

    console.log("[EXTRACT] Downloading:", storageKey, "for user:", user.id);

    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from("resumes")
      .download(storageKey);

    if (dlErr || !fileBlob) {
      console.error("[EXTRACT] Download failed:", dlErr?.message);
      return new Response(JSON.stringify({ error: "Could not load your uploaded resume. Please re-upload it in Profile Settings." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ab = await fileBlob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const lowerName = (filename || storageKey || "").toLowerCase();
    const isDocx =
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".doc") ||
      mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime_type === "application/msword";

    let textPayload: any[];
    if (isDocx) {
      const text = (await extractDocxText(bytes)).trim();
      if (!text) {
        return new Response(JSON.stringify({ error: "Could not read this file. Please upload a PDF version." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      textPayload = [{
        type: "text",
        text:
          "Convert this resume into a faithful structured outline that preserves the original sections, order, and bullet points exactly. Resume text follows:\n\n" + text,
      }];
    } else {
      // PDF / image — let the model OCR it via image_url
      // Re-encode to base64 (we already have bytes)
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const b64 = btoa(binary);
      const dataUri = `data:${mime_type || "application/pdf"};base64,${b64}`;
      textPayload = [
        {
          type: "text",
          text:
            "Convert this resume into a faithful structured outline that preserves the original sections, their order, items, and bullet points EXACTLY as they appear in the file.",
        },
        { type: "image_url", image_url: { url: dataUri } },
      ];
    }

    const tool = {
      type: "function",
      function: {
        name: "return_resume_structure",
        description:
          "Return the resume in structured form, preserving the original sections, ordering, items, and bullets exactly.",
        parameters: {
          type: "object",
          properties: {
            header: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                contact_details: { type: "array", items: { type: "string" } },
              },
              required: ["full_name", "contact_details"],
            },
            summary: { type: "string", description: "Original summary / objective if present, else empty string" },
            skills: { type: "array", items: { type: "string" } },
            section_order: {
              type: "array",
              description: "The ORDER in which 'summary', 'skills', and each custom section title appear in the resume — top to bottom. Use exactly the section titles you put in `sections` (verbatim), plus the literal strings 'summary' and 'skills' if those exist in the resume.",
              items: { type: "string" },
            },
            sections: {
              type: "array",
              description: "Sections in the EXACT order they appear in the resume (e.g. Experience, Projects, Education, etc.). Do NOT include Summary or Skills here — those go in the dedicated fields.",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string", description: "Job title / project name / degree" },
                        subheading: { type: "string", description: "Company / institution / publisher" },
                        date: { type: "string", description: "Date range exactly as written" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["heading", "bullets"],
                    },
                  },
                },
                required: ["title", "items"],
              },
            },
          },
          required: ["header", "skills", "sections"],
        },
      },
    };

    // Retry across models with timeouts so a single stalled model never hangs the user.
    const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "google/gemini-2.5-flash-lite"];
    let aiResp: Response | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < models.length; attempt++) {
      const model = models[attempt];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      try {
        console.log(`[EXTRACT] Attempt ${attempt + 1} model=${model}`);
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a resume structure extractor. Reproduce the candidate's resume EXACTLY as a structured object. Do NOT invent, summarize, or reorganize. Keep section titles, ordering, headings, dates, and bullet wording exactly as they appear. Each bullet should be a single bullet point, no merging.",
              },
              { role: "user", content: textPayload },
            ],
            tools: [tool],
            tool_choice: { type: "function", function: { name: "return_resume_structure" } },
          }),
        });
        clearTimeout(timeout);

        if (r.status === 429) {
          return new Response(JSON.stringify({ error: "AI is busy. Please try again in a moment." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.status === 402) {
          return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.ok) {
          aiResp = r;
          break;
        }
        lastErr = `status ${r.status}`;
        console.error(`[EXTRACT] Attempt ${attempt + 1} failed:`, lastErr);
      } catch (err: any) {
        clearTimeout(timeout);
        const isAbort = err?.name === "AbortError";
        lastErr = isAbort ? "timeout" : (err?.message || "network error");
        console.error(`[EXTRACT] Attempt ${attempt + 1} ${lastErr}`);
      }
    }

    if (!aiResp) {
      return new Response(JSON.stringify({ error: "Could not read your resume right now. Please try again in a moment." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return a valid resume." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let structure: any;
    try {
      structure = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned invalid resume structure." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Defensive defaults
    structure.summary = structure.summary || "";
    structure.skills = Array.isArray(structure.skills) ? structure.skills : [];
    structure.sections = Array.isArray(structure.sections) ? structure.sections : [];
    structure.header = structure.header || { full_name: "", contact_details: [] };
    structure.header.contact_details = Array.isArray(structure.header.contact_details)
      ? structure.header.contact_details
      : [];
    // Default section_order: summary → skills → other sections (legacy fallback)
    if (!Array.isArray(structure.section_order) || structure.section_order.length === 0) {
      const order: string[] = [];
      if (structure.summary && String(structure.summary).trim()) order.push("summary");
      if (Array.isArray(structure.skills) && structure.skills.length) order.push("skills");
      for (const s of structure.sections) {
        if (s?.title) order.push(s.title);
      }
      structure.section_order = order;
    }

    console.log(
      "[EXTRACT] OK — sections:",
      structure.sections.length,
      "skills:",
      structure.skills.length,
    );

    return new Response(JSON.stringify({ structure }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[EXTRACT] Unhandled:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
