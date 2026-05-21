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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { file_base64, filename, mime_type } = await req.json();
    if (!file_base64 || !filename) {
      return new Response(JSON.stringify({ error: "file_base64 and filename required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDocx = mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
      || mime_type === "application/msword"
      || filename.toLowerCase().endsWith(".docx") 
      || filename.toLowerCase().endsWith(".doc");

    let contentPayload: any[];
    
    if (isDocx) {
      const binaryStr = atob(file_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      let extractedText = "";
      try {
        const zip = bytes;
        const td = new TextDecoder();
        
        // Find End of Central Directory record (search backwards)
        let eocdOffset = -1;
        for (let i = zip.length - 22; i >= 0; i--) {
          if (zip[i] === 0x50 && zip[i+1] === 0x4b && zip[i+2] === 0x05 && zip[i+3] === 0x06) {
            eocdOffset = i;
            break;
          }
        }
        
        if (eocdOffset === -1) throw new Error("Not a valid ZIP file");
        
        const cdOffset = zip[eocdOffset + 16] | (zip[eocdOffset + 17] << 8) | (zip[eocdOffset + 18] << 16) | (zip[eocdOffset + 19] << 24);
        const cdEntries = zip[eocdOffset + 10] | (zip[eocdOffset + 11] << 8);
        
        // Parse central directory to get accurate file info
        const targetFiles = ["word/document.xml"];
        const fileEntries: { name: string; offset: number; compSize: number; uncompSize: number; method: number }[] = [];
        let pos = cdOffset;
        
        for (let i = 0; i < cdEntries && pos < zip.length - 46; i++) {
          const sig = zip[pos] | (zip[pos+1] << 8) | (zip[pos+2] << 16) | (zip[pos+3] << 24);
          if (sig !== 0x02014b50) break;
          
          const method = zip[pos + 10] | (zip[pos + 11] << 8);
          const compSize = zip[pos + 20] | (zip[pos + 21] << 8) | (zip[pos + 22] << 16) | (zip[pos + 23] << 24);
          const uncompSize = zip[pos + 24] | (zip[pos + 25] << 8) | (zip[pos + 26] << 16) | (zip[pos + 27] << 24);
          const nameLen = zip[pos + 28] | (zip[pos + 29] << 8);
          const extraLen = zip[pos + 30] | (zip[pos + 31] << 8);
          const commentLen = zip[pos + 32] | (zip[pos + 33] << 8);
          const localHeaderOffset = zip[pos + 42] | (zip[pos + 43] << 8) | (zip[pos + 44] << 16) | (zip[pos + 45] << 24);
          const name = td.decode(zip.slice(pos + 46, pos + 46 + nameLen));
          
          if (targetFiles.includes(name)) {
            fileEntries.push({ name, offset: localHeaderOffset, compSize, uncompSize, method });
          }
          
          pos += 46 + nameLen + extraLen + commentLen;
        }
        
        for (const entry of fileEntries) {
          // Read local file header to get actual data offset
          const lhNameLen = zip[entry.offset + 26] | (zip[entry.offset + 27] << 8);
          const lhExtraLen = zip[entry.offset + 28] | (zip[entry.offset + 29] << 8);
          const dataStart = entry.offset + 30 + lhNameLen + lhExtraLen;
          const rawData = zip.slice(dataStart, dataStart + entry.compSize);
          
          let xmlBytes: Uint8Array;
          if (entry.method === 8) {
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
            const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
            let m;
            while ((m = regex.exec(para)) !== null) texts.push(m[1]);
            if (texts.length > 0) extractedText += texts.join("") + "\n";
          }
        }
        
        console.log(`DOCX extraction: found ${fileEntries.length} target files, extracted ${extractedText.length} chars`);
      } catch (e) {
        console.error("DOCX extraction error:", e);
        // Fallback: try to find readable text in binary
        const td2 = new TextDecoder("utf-8", { fatal: false });
        const raw = td2.decode(bytes);
        // Try extracting w:t tags from raw (uncompressed) data
        const regex2 = /<w:t[^>]*>([^<]+)<\/w:t>/g;
        let m2;
        while ((m2 = regex2.exec(raw)) !== null) extractedText += m2[1] + " ";
        if (!extractedText.trim()) {
          extractedText = raw.replace(/<[^>]+>/g, " ").replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
        }
      }
      
      if (!extractedText.trim()) {
        return new Response(JSON.stringify({ error: "Could not extract text from this document. Please try uploading a PDF version instead." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      contentPayload = [
        { type: "text", text: `Parse this resume text and extract all available profile fields. Only include fields you can clearly find in the document. The filename is: ${filename}\n\nResume content:\n${extractedText}` },
      ];
    } else {
      // PDF or image: send as data URI
      const dataUri = `data:${mime_type || "application/pdf"};base64,${file_base64}`;
      contentPayload = [
        { type: "text", text: `Parse this resume and extract all available profile fields. Only include fields you can clearly find in the document. The filename is: ${filename}` },
        { type: "image_url", image_url: { url: dataUri } },
      ];
    }

    const extractionTool = {
      type: "function",
      function: {
        name: "extract_resume_fields",
        description: "Extract structured profile fields from a resume document. Only include fields that are clearly present. Do NOT guess or infer missing values.",
        parameters: {
          type: "object",
          properties: {
            first_name: { type: "string", description: "First name" },
            last_name: { type: "string", description: "Last name" },
            email: { type: "string", description: "Email address" },
            phone: { type: "string", description: "Phone number" },
            city: { type: "string", description: "City" },
            state: { type: "string", description: "State/Province" },
            zip: { type: "string", description: "ZIP/Postal code" },
            address: { type: "string", description: "Street address" },
            linkedin_url: { type: "string", description: "LinkedIn profile URL" },
            github_url: { type: "string", description: "GitHub profile URL" },
            portfolio_url: { type: "string", description: "Portfolio or personal website URL" },
            skills: {
              type: "array",
              items: { type: "string" },
              description: "List of skills found",
            },
            work_experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  company: { type: "string" },
                  start_date: { type: "string", description: "Start date in YYYY-MM format" },
                  end_date: { type: "string", description: "End date in YYYY-MM format, empty if current" },
                  is_current: { type: "boolean" },
                  location: { type: "string" },
                  description: { type: "string" },
                },
                required: ["title", "company"],
              },
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  school: { type: "string" },
                  degree: { type: "string" },
                  major: { type: "string", description: "Field of study" },
                  graduation_year: { type: "string" },
                  gpa: { type: "string" },
                },
                required: ["school"],
              },
            },
            certifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  issuer: { type: "string" },
                  date_obtained: { type: "string" },
                  expiration_date: { type: "string" },
                },
                required: ["name"],
              },
            },
            summary: { type: "string", description: "Professional summary or objective" },
            experience_years: { type: "integer", description: "Total years of experience if stated" },
          },
          required: [],
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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a resume parser. Extract ONLY information that is explicitly stated in the resume. Do NOT guess, infer, or fabricate any values. If a field is not found, omit it entirely. For dates, use YYYY-MM format. For skills, extract individual skill names as separate array items.`,
          },
          {
            role: "user",
            content: contentPayload,
          },
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_resume_fields" } },
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
      throw new Error("No extraction result from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ extracted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
